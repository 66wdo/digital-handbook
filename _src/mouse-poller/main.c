/* =====================================================================
 *  Mouse Polling Rate Tester 8K  (native Win32, no runtime dependency)
 *
 *  Why it can measure up to 8000 Hz while browsers cap near 4 kHz:
 *   - Uses Raw Input (WM_INPUT): one message per hardware USB report,
 *     no pointer batching / browser event-coalescing.
 *   - Timestamps every report with QueryPerformanceCounter (~0.1 us),
 *     not GetMessageTime.
 *   - Sampling (hot path) is decoupled from painting: WM_INPUT only
 *     pushes a QPC timestamp, UI refreshes on a 30 ms timer, so the
 *     message pump is never slowed by drawing.
 *
 *  Build (TCC):
 *   tcc -m64 -mwindows -static -o MousePoller8K.exe main.c ^
 *       -luser32 -lgdi32 -lkernel32
 * ===================================================================== */
#define _WIN32_WINNT 0x0601
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <math.h>
#include <stdio.h>
#include <stdarg.h>
#include <string.h>

#ifndef HID_USAGE_PAGE_GENERIC
#define HID_USAGE_PAGE_GENERIC ((USHORT)0x01)
#endif
#ifndef HID_USAGE_GENERIC_MOUSE
#define HID_USAGE_GENERIC_MOUSE ((USHORT)0x02)
#endif

#define RING      512          /* recent timestamps used for live rate   */
#define WAVE      320          /* waveform history points                */
#define BIN_US    25           /* histogram bin width in microseconds    */
#define BIN_N     161          /* 0..4000 us in 25 us bins + overflow    */
#define TIMER_MS  30           /* UI refresh interval                     */
#define NOISE_US  110          /* reject report gaps shorter than this     */
#define ID_RESET  1001

/* ---- colors (dark instrument theme, no indigo/purple) ---- */
static const COLORREF C_BG    = RGB(17, 19, 23);
static const COLORREF C_PANEL = RGB(27, 30, 36);
static const COLORREF C_GRID  = RGB(44, 49, 57);
static const COLORREF C_TXT   = RGB(214, 220, 228);
static const COLORREF C_DIM   = RGB(132, 140, 150);
static const COLORREF C_CYAN  = RGB(64, 214, 196);
static const COLORREF C_ORG   = RGB(255, 168, 64);
static const COLORREF C_GRN   = RGB(120, 210, 110);
static const COLORREF C_RED   = RGB(232, 96, 96);

/* ---- dynamically resolved APIs (missing from old TCC import lib) ---- */
typedef BOOL (WINAPI *PFN_RegRID)(RAWINPUTDEVICE*, UINT, UINT);
typedef BOOL (WINAPI *PFN_DpiAware)(void);
static PFN_RegRID pRegRID=0;
static PFN_DpiAware pDpiAware=0;

/* ---- state ---- */
static HWND  g_hwnd;
static HFONT g_fBig, g_fMid, g_fNorm, g_fSmall, g_fMono;
static double g_qfreq;
static double g_ring[RING];  static int g_ri=0, g_rc=0;     /* timestamps */
static double g_last=0;
static unsigned long long g_events=0;
static double g_minDt=0, g_maxDt=0, g_sum=0, g_sum2=0;
static double g_peakHz=0;
static unsigned long g_hist[BIN_N];
static double g_wave[WAVE]; static int g_wi=0, g_wc=0;
static int g_active=0;            /* 1 if reports arrived recently */
static DWORD g_lastEventTick=0;

static double now_sec(void){ LARGE_INTEGER q; QueryPerformanceCounter(&q); return (double)q.QuadPart/g_qfreq; }

static void stats_reset(void){
    g_ri=0; g_rc=0; g_last=0; g_events=0;
    g_minDt=g_maxDt=g_sum=g_sum2=g_peakHz=0;
    memset(g_hist,0,sizeof(g_hist)); g_wi=g_wc=0; memset(g_wave,0,sizeof(g_wave));
    g_active=0;
}

static double window_hz(void){
    if(g_rc<2) return 0;
    double first = g_ring[(g_ri - g_rc + RING) % RING];
    double span  = g_ring[(g_ri-1+RING)%RING] - first;
    if(span<=0) return 0;
    return (g_rc-1)/span;
}

/* modal (most common) rate: the histogram bin with the most reports, converted
   back to Hz. Unlike the sliding-window CURRENT/AVERAGE, this is robust to
   uneven hand speed and directly reveals the mouse's real rate tier
   (a stable 8K mouse peaks its histogram right at the 125us bin => ~8000Hz). */
static double modal_hz(void){
    int show=2000/BIN_US; if(show>BIN_N)show=BIN_N;
    unsigned long mx=0; int bi=-1;
    for(int i=0;i<show;i++){ if(g_hist[i]>mx){ mx=g_hist[i]; bi=i; } }
    if(bi<0||mx==0) return 0;
    double us=(bi*BIN_US+BIN_US/2.0);
    return 1e6/us;
}

static void on_raw_input(void){
    double t=now_sec();
    DWORD tk=GetTickCount();
    g_active=1; g_lastEventTick=tk;
    /* noise gate: reject physically impossible gaps (<110us => >~9kHz),
       e.g. synthetic injection / coalesced duplicate messages. Real 8K is
       125us and is never affected. IMPORTANT: a rejected event must NOT update
       g_last -- otherwise the next valid interval is measured from the rejected
       timestamp, underestimating dt and producing a phantom ~50kHz PEAK. */
    if(g_last>0 && (t-g_last)>0 && (t-g_last)<NOISE_US*1e-6){ return; }
    g_ring[g_ri]=t; g_ri=(g_ri+1)%RING; if(g_rc<RING)g_rc++;
    if(g_last>0){
        double dt=t-g_last;
        if(dt>0){
            g_events++;
            g_sum+=dt; g_sum2+=dt*dt;
            if(g_minDt==0||dt<g_minDt)g_minDt=dt;
            if(dt>g_maxDt)g_maxDt=dt;
            double hz=1.0/dt; if(hz>g_peakHz)g_peakHz=hz;
            long us=(long)(dt*1e6);
            long b=us/BIN_US; if(b<0)b=0; if(b>=BIN_N)b=BIN_N-1;
            g_hist[b]++;
        }
    }
    g_last=t;
}

/* ---------------- drawing helpers ---------------- */
static void fill(HDC h,RECT r,COLORREF c){ HBRUSH b=CreateSolidBrush(c);FillRect(h,&r,b);DeleteObject(b); }
static void frame(HDC h,RECT r,COLORREF c){ HPEN p=CreatePen(PS_SOLID,1,c);HGDIOBJ o=SelectObject(h,p);HGDIOBJ ob=(HGDIOBJ)GetStockObject(NULL_BRUSH);SelectObject(h,ob);Rectangle(h,r.left,r.top,r.right,r.bottom);SelectObject(h,o);DeleteObject(p); }
static void txt(HDC h,int x,int y,const char*s,COLORREF c,HFONT f,int align){
    SetBkMode(h,TRANSPARENT);SetTextColor(h,c);SelectObject(h,f);SetTextAlign(h,align|TA_TOP);TextOutA(h,x,y,s,lstrlenA(s));
}
static void txtf(HDC h,int x,int y,COLORREF c,HFONT f,int align,const char*fmt,...){
    char b[160]; va_list ap; va_start(ap,fmt); vsprintf(b,fmt,ap); va_end(ap);
    txt(h,x,y,b,c,f,align);
}
static int fheight(HDC h,HFONT f){ HGDIOBJ o=SelectObject(h,f);TEXTMETRIC tm;GetTextMetrics(h,&tm);SelectObject(h,o);return tm.tmHeight; }

static void panel(HDC h,RECT r){ fill(h,r,C_PANEL); frame(h,r,C_GRID); }

/* big number with 7-segment-ish clean look */
static void draw_big_number(HDC h,RECT area,double hz,int active){
    char b[64]; sprintf(b,"%.0f",hz);
    COLORREF c = active ? (hz>=7000?C_CYAN:(hz>=3500?C_GRN:C_ORG)) : C_DIM;
    SetBkMode(h,TRANSPARENT); SelectObject(h,g_fBig); SetTextColor(h,c);
    SetTextAlign(h,TA_CENTER);
    RECT tr=area; DrawTextA(h,b,-1,&tr,DT_CENTER|DT_VCENTER|DT_SINGLELINE);
}

static void draw_waveform(HDC h,RECT r){
    panel(h,r);
    txt(h,r.left+10,r.top+8,"RECENT RATE (live window Hz)",C_DIM,g_fSmall,TA_LEFT);
    int pl=r.left+46, pr=r.right-12, pt=r.top+30, pb=r.bottom-10;
    /* horizontal grid lines at standard polling rates (log-ish: use linear 0..8500) */
    double marks[5]={1000,2000,4000,6000,8000};
    for(int i=0;i<5;i++){
        int y=pb-(int)(marks[i]/8500.0*(pb-pt));
        HPEN p=CreatePen(PS_DOT,1,C_GRID);HGDIOBJ o=SelectObject(h,p);
        MoveToEx(h,pl,y,NULL);LineTo(h,pr,y);SelectObject(h,o);DeleteObject(p);
        txtf(h,pl-4,y-6,C_DIM,g_fSmall,TA_RIGHT,"%.0f",marks[i]);
    }
    if(g_wc<2){ txt(h,(pl+pr)/2,(pt+pb)/2-8,"move mouse...",C_DIM,g_fNorm,TA_CENTER); return; }
    HPEN p=CreatePen(PS_SOLID,2,C_CYAN);HGDIOBJ o=SelectObject(h,p);
    int prevx=0,prevy=0,first=1;
    for(int i=0;i<g_wc;i++){
        int idx=(g_wi-g_wc+WAVE+i)%WAVE;
        double v=g_wave[idx]; if(v>8500)v=8500; if(v<0)v=0;
        int x=pl+(pr-pl)*i/(WAVE-1);
        int y=pb-(int)(v/8500.0*(pb-pt));
        if(first){MoveToEx(h,x,y,NULL);first=0;}else LineTo(h,x,y);
        prevx=x;prevy=y;
    }
    SelectObject(h,o);DeleteObject(p);
}

static void draw_histogram(HDC h,RECT r){
    panel(h,r);
    txt(h,r.left+10,r.top+8,"INTERVAL DISTRIBUTION - us between reports, stable 8K clusters near 125 us",C_DIM,g_fSmall,TA_LEFT);
    int pl=r.left+12,pr=r.right-12,pt=r.top+30,pb=r.bottom-22;
    unsigned long mx=1;
    /* fixed 0..2000 us window (covers 500 Hz..8000 Hz+); long idle gaps ignored */
    int show=2000/BIN_US; if(show>BIN_N)show=BIN_N;
    for(int i=0;i<show;i++)if(g_hist[i]>mx)mx=g_hist[i];
    /* target interval guides: 8000=125us 4000=250 2000=500 1000=1000 500=2000 */
    double guide[5]={125,250,500,1000,2000}; const char*glab[5]={"8K","4K","2K","1K","500"};
    for(int i=0;i<5;i++){
        int x=pl+(int)(guide[i]/BIN_US*(pr-pl)/show);
        if(x<pr-4){
            HPEN p=CreatePen(PS_DOT,1,C_GRID);HGDIOBJ o=SelectObject(h,p);
            MoveToEx(h,x,pt,NULL);LineTo(h,x,pb);SelectObject(h,o);DeleteObject(p);
            txt(h,x+2,pb+6,glab[i],C_DIM,g_fSmall,TA_LEFT);
        }
    }
    int bw=(pr-pl)/show; if(bw<1)bw=1;
    for(int i=0;i<show;i++){
        int hgt=(int)((double)g_hist[i]/mx*(pb-pt));
        RECT b2; b2.left=pl+i*bw+1;b2.right=pl+(i+1)*bw-1;b2.bottom=pb;b2.top=pb-hgt;
        int us=i*BIN_US; COLORREF cc=(us>=100&&us<=150)?C_CYAN:C_ORG;
        HBRUSH br=CreateSolidBrush(cc);FillRect(h,&b2,br);DeleteObject(br);
    }
}

static void paint(HDC screen, int W,int H){
    HDC mem=CreateCompatibleDC(screen);
    HBITMAP bm=CreateCompatibleBitmap(screen,W,H);
    HGDIOBJ old=SelectObject(mem,bm);
    RECT all; all.left=0;all.top=0;all.right=W;all.bottom=H; fill(mem,all,C_BG);

    /* header */
    txt(mem,16,12,"MOUSE POLLING RATE TESTER  -  8000 Hz",C_TXT,g_fMid,TA_LEFT);
    txt(mem,W-16,16,"Raw Input + QPC  -  native (no browser cap)",C_DIM,g_fSmall,TA_RIGHT);

    int top=44;
    /* left big number panel */
    RECT big; big.left=16;big.top=top;big.right=360;big.bottom=top+190; panel(mem,big);
    txt(mem,big.left+14,big.top+10,"CURRENT",C_DIM,g_fSmall,TA_LEFT);
    RECT bn; bn.left=big.left;bn.top=big.top+24;bn.right=big.right;bn.bottom=big.top+130;
    double whz=window_hz();
    /* active if an event arrived in last 120 ms */
    int active=(GetTickCount()-g_lastEventTick)<120;
    draw_big_number(mem,bn,active?whz:0,active);
    txtf(mem,(big.left+big.right)/2,big.bottom-38,active?C_GRN:C_DIM,g_fNorm,TA_CENTER,"Hz   %s",active?"ACTIVE":"IDLE");

    /* right stats grid 2x4 */
    int gx=372, gw=W-gx-16, gh=190, cellw=gw/4, cellh=gh/2;
    double avgDt=g_events?g_sum/g_events:0;
    double var=g_events?(g_sum2/g_events-avgDt*avgDt):0; if(var<0)var=0;
    double jitter=sqrt(var)*1e6;
    double avgHz=avgDt>0?1.0/avgDt:0;
    double modal=modal_hz();
    const char*labels[8]={"AVERAGE","PEAK","MODE (typical)","AVG INTERVAL","JITTER (std)","EVENTS","ELAPSED","MIN GAP"};
    char vals[8][48];
    sprintf(vals[0],"%.0f Hz",avgHz);
    sprintf(vals[1],"%.0f Hz",g_peakHz);
    if(modal>0) sprintf(vals[2],"~%.0f Hz",modal); else sprintf(vals[2],"--");
    sprintf(vals[3],"%.0f us",avgDt*1e6);
    sprintf(vals[4],"%.1f us",jitter);
    sprintf(vals[5],"%llu",g_events);
    double el=g_last? (now_sec()-(g_ring[(g_ri-g_rc+RING)%RING])):0; if(el<0)el=0;
    int mm=(int)(el/60),ss=(int)el%60; sprintf(vals[6],"%d:%02d",mm,ss);
    sprintf(vals[7],"%.0f us",g_minDt*1e6);
    for(int i=0;i<8;i++){
        int cx=gx+(i%4)*cellw, cy=top+(i/4)*cellh;
        RECT c;c.left=cx+4;c.top=cy+4;c.right=cx+cellw-4;c.bottom=cy+cellh-4; panel(mem,c);
        txt(mem,c.left+12,c.top+10,labels[i],C_DIM,g_fSmall,TA_LEFT);
        txt(mem,c.left+12,c.top+38,vals[i],C_TXT,g_fMid,TA_LEFT);
    }

    int y2=top+gh+12;
    RECT wv;wv.left=16;wv.top=y2;wv.right=W-16;wv.bottom=y2+170; draw_waveform(mem,wv);
    int y3=wv.bottom+10;
    RECT hs;hs.left=16;hs.top=y3;hs.right=W-16;hs.bottom=H-40; draw_histogram(mem,hs);

    txt(mem,16,H-30,"Move rapidly & steadily. MODE = most common interval = true rate tier; PEAK is only a momentary spike.",C_DIM,g_fSmall,TA_LEFT);
    txt(mem,W-16,H-30,"[R] Reset",C_DIM,g_fSmall,TA_RIGHT);

    BitBlt(screen,0,0,W,H,mem,0,0,SRCCOPY);
    SelectObject(mem,old);DeleteObject(bm);DeleteDC(mem);
}

static void refresh_wave(void){
    double h=window_hz();
    g_wave[g_wi]=h;g_wi=(g_wi+1)%WAVE;if(g_wc<WAVE)g_wc++;
}

/* ---------------- window ---------------- */
static LRESULT CALLBACK WndProc(HWND hwnd,UINT msg,WPARAM wp,LPARAM lp){
    switch(msg){
    case WM_CREATE:{
        RAWINPUTDEVICE rid; rid.usUsagePage=HID_USAGE_PAGE_GENERIC;rid.usUsage=HID_USAGE_GENERIC_MOUSE;
        rid.dwFlags=RIDEV_INPUTSINK;rid.hwndTarget=hwnd;
        if(!pRegRID || !pRegRID(&rid,1,sizeof(rid)))MessageBoxA(hwnd,"RegisterRawInputDevices failed","Error",MB_OK);
        SetTimer(hwnd,1,TIMER_MS,NULL);
        return 0;
    }
    case WM_INPUT:
        on_raw_input();            /* hot path: timestamp only */
        return 0;
    case WM_TIMER:
        if(wp==1){ refresh_wave(); InvalidateRect(hwnd,NULL,FALSE); }
        return 0;
    case WM_KEYDOWN:
        if(wp=='R')stats_reset();
        return 0;
    case WM_COMMAND:
        if(LOWORD(wp)==ID_RESET)stats_reset();
        return 0;
    case WM_SIZE: InvalidateRect(hwnd,NULL,TRUE); return 0;
    case WM_ERASEBKGND: return 1;
    case WM_PAINT:{ PAINTSTRUCT ps;HDC h=BeginPaint(hwnd,&ps);RECT rc;GetClientRect(hwnd,&rc);paint(h,rc.right,rc.bottom);EndPaint(hwnd,&ps);return 0; }
    case WM_DESTROY: PostQuitMessage(0);return 0;
    }
    return DefWindowProc(hwnd,msg,wp,lp);
}

static HFONT mkfont(int h,int weight,const char*face){
    return CreateFontA(h,0,0,0,weight,0,0,0,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH|FF_SWISS,face);
}

int WINAPI WinMain(HINSTANCE hi,HINSTANCE hp,LPSTR cl,int sc){
    (void)hp;(void)cl;(void)sc;
    LARGE_INTEGER qf; QueryPerformanceFrequency(&qf); g_qfreq=(double)qf.QuadPart;
    HMODULE u32=GetModuleHandleA("user32.dll");
    pRegRID=(PFN_RegRID)GetProcAddress(u32,"RegisterRawInputDevices");
    pDpiAware=(PFN_DpiAware)GetProcAddress(u32,"SetProcessDPIAware");
    if(pDpiAware)pDpiAware();
    SetPriorityClass(GetCurrentProcess(),HIGH_PRIORITY_CLASS);

    WNDCLASSA wc;memset(&wc,0,sizeof(wc));
    wc.lpfnWndProc=WndProc;wc.hInstance=hi;wc.hCursor=LoadCursor(0,IDC_ARROW);
    wc.hbrBackground=(HBRUSH)GetStockObject(BLACK_BRUSH);wc.lpszClassName="MP8K";
    RegisterClassA(&wc);
    int cw=900,ch=720;
    DWORD style=WS_OVERLAPPED|WS_CAPTION|WS_SYSMENU|WS_MINIMIZEBOX; /* fixed size */
    RECT wr;wr.left=0;wr.top=0;wr.right=cw;wr.bottom=ch;
    AdjustWindowRect(&wr,style,FALSE);
    int W=wr.right-wr.left,H=wr.bottom-wr.top;
    int sx=(GetSystemMetrics(SM_CXSCREEN)-W)/2, sy=(GetSystemMetrics(SM_CYSCREEN)-H)/2;
    g_hwnd=CreateWindowExA(0,"MP8K","Mouse Polling Rate Tester 8K",
        style,sx,sy,W,H,0,0,hi,0);

    g_fBig =mkfont(64,FW_BOLD,"Segoe UI");
    g_fMid =mkfont(22,FW_SEMIBOLD,"Segoe UI");
    g_fNorm=mkfont(18,FW_NORMAL,"Segoe UI");
    g_fSmall=mkfont(15,FW_NORMAL,"Segoe UI");

    ShowWindow(g_hwnd,SW_SHOW);UpdateWindow(g_hwnd);
    MSG m;
    while(GetMessage(&m,0,0,0)>0){ TranslateMessage(&m);DispatchMessage(&m); }
    return 0;
}

