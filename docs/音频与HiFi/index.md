# 音频与 HiFi

音频设备的挑选容易陷入参数玄学和品牌崇拜。本分区坚持一条主线：<span class="hl-key">先搞清信号链路与功能差异，再谈风格与听感；只讲技术原理，不夸任何品牌</span>。

## 信号链路先理清

<div class="idg" data-mode="none">
<div class="idg-stage"><svg viewBox="0 0 872 232" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="音频信号链路交互图：数字音源经数字输入到解码DAC，再经模拟信号线到耳放功放，最后经放大后信号驱动耳机或音箱，可点击节点和线路查看">
  <defs>
    <linearGradient id="auBase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c4c72"/><stop offset=".5" stop-color="#2c3a59"/><stop offset="1" stop-color="#1c253a"/></linearGradient>
    <linearGradient id="auSlot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1322"/><stop offset="1" stop-color="#232f4d"/></linearGradient>
    <filter id="auSoft" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0a1120" flood-opacity=".32"/></filter>
  </defs>

  <g class="idg-node" data-key="src" aria-label="数字音源">
    <rect class="idg-card" x="24" y="70" width="158" height="140" rx="14" fill="url(#auBase)" stroke="#4c5d84" stroke-width="1.6" filter="url(#auSoft)"/>
    <rect x="78" y="92" width="50" height="62" rx="7" fill="url(#auSlot)" stroke="#8895b4" stroke-width="2"/>
    <rect x="84" y="100" width="38" height="34" fill="#16203a"/>
    <polygon points="100,112 100,126 112,119" fill="#3fe6d2"/>
    <circle cx="103" cy="146" r="2.4" fill="#8895b4"/>
    <text x="103" y="182" text-anchor="middle" font-size="15" font-weight="800" fill="#eef2f9">数字音源</text>
    <text x="103" y="200" text-anchor="middle" font-size="11" fill="#aebbd6">手机 / 电脑 / 播放器</text>
  </g>

  <g class="idg-node" data-key="dac" aria-label="解码 DAC">
    <rect class="idg-card" x="246" y="70" width="158" height="140" rx="14" fill="url(#auBase)" stroke="#4c5d84" stroke-width="1.6" filter="url(#auSoft)"/>
    <rect x="290" y="104" width="70" height="44" rx="6" fill="url(#auSlot)" stroke="#2dd4bf" stroke-width="2"/>
    <rect x="312" y="116" width="26" height="20" rx="3" fill="#10203a" stroke="#3fe6d2" stroke-width="1.4"/>
    <text x="325" y="131" text-anchor="middle" font-size="11" font-weight="800" fill="#3fe6d2">D/A</text>
    <text x="325" y="182" text-anchor="middle" font-size="15" font-weight="800" fill="#eef2f9">解码 DAC</text>
    <text x="325" y="200" text-anchor="middle" font-size="11" fill="#aebbd6">数字 → 模拟</text>
  </g>

  <g class="idg-node" data-key="amp" aria-label="耳放功放">
    <rect class="idg-card" x="468" y="70" width="158" height="140" rx="14" fill="url(#auBase)" stroke="#4c5d84" stroke-width="1.6" filter="url(#auSoft)"/>
    <rect x="512" y="104" width="70" height="44" rx="6" fill="url(#auSlot)" stroke="#ffc233" stroke-width="2"/>
    <polygon points="524,116 524,136 552,126" fill="none" stroke="#ffd45e" stroke-width="2" stroke-linejoin="round"/>
    <line x1="516" y1="126" x2="524" y2="126" stroke="#ffd45e" stroke-width="2"/>
    <line x1="552" y1="126" x2="560" y2="126" stroke="#ffd45e" stroke-width="2"/>
    <text x="547" y="182" text-anchor="middle" font-size="15" font-weight="800" fill="#eef2f9">耳放 / 功放</text>
    <text x="547" y="200" text-anchor="middle" font-size="11" fill="#aebbd6">电压 / 电流驱动</text>
  </g>

  <g class="idg-node" data-key="hp" aria-label="耳机音箱">
    <rect class="idg-card" x="690" y="70" width="158" height="140" rx="14" fill="url(#auBase)" stroke="#4c5d84" stroke-width="1.6" filter="url(#auSoft)"/>
    <path d="M728 132 a41 41 0 0 1 82 0" fill="none" stroke="#54e08a" stroke-width="3" stroke-linecap="round"/>
    <rect x="722" y="128" width="12" height="22" rx="5" fill="url(#auSlot)" stroke="#54e08a" stroke-width="2"/>
    <rect x="804" y="128" width="12" height="22" rx="5" fill="url(#auSlot)" stroke="#54e08a" stroke-width="2"/>
    <text x="769" y="182" text-anchor="middle" font-size="15" font-weight="800" fill="#eef2f9">耳机 / 音箱</text>
    <text x="769" y="200" text-anchor="middle" font-size="11" fill="#aebbd6">电信号 → 声音</text>
  </g>

  <g class="idg-link" data-key="digital" aria-label="数字输入线">
    <line class="idg-hit" x1="182" y1="140" x2="240" y2="140" stroke-width="18"/>
    <line class="idg-line" x1="182" y1="140" x2="238" y2="140" stroke="#ffc233" stroke-width="3" stroke-linecap="round"/>
    <polygon points="246,140 236,134 236,146" fill="#ffc233"/>
  </g>
  <g class="idg-link" data-key="analog" aria-label="模拟信号线">
    <line class="idg-hit" x1="404" y1="140" x2="462" y2="140" stroke-width="18"/>
    <line class="idg-line" x1="404" y1="140" x2="460" y2="140" stroke="#2dd4bf" stroke-width="3" stroke-linecap="round"/>
    <polygon points="468,140 458,134 458,146" fill="#2dd4bf"/>
  </g>
  <g class="idg-link" data-key="driven" aria-label="放大后信号线">
    <line class="idg-hit" x1="626" y1="140" x2="684" y2="140" stroke-width="18"/>
    <line class="idg-line" x1="626" y1="140" x2="682" y2="140" stroke="#42a5f5" stroke-width="3" stroke-linecap="round"/>
    <polygon points="690,140 680,134 680,146" fill="#42a5f5"/>
  </g>
</svg></div>
<div class="idg-panel" aria-live="polite"><div class="idg-panel-title"></div><div class="idg-panel-body"></div></div>
<script type="application/json" class="idg-data">{"__intro": {"title": "点一点这条链路上的设备或线", "body": "声音进耳朵要过四关：<b>数字音源 → 解码 DAC → 耳放 / 功放 → 耳机 / 音箱</b>。点设备看每一关管什么、短板在哪；点三段线看信号怎么传；底部链接可跳到对应文章深入看。"}, "src": {"title": "数字音源", "body": "手机、电脑、播放器或流媒体提供<b>数字信号</b>，音源本身的质量（采样率、是否无损、母带）决定上限。走蓝牙的话，进 DAC 前还要先经过一次<b>编码压缩</b>。", "link": {"href": "音源数字音频与房间声学/", "text": "看音源与采样率"}}, "dac": {"title": "解码 DAC（数字 → 模拟）", "body": "把数字信号转成连续的<b>模拟波形</b>，管「转得准不准、干不干净」。现代解码普遍用缓冲 + 本地时钟重组数据，前端数字线的「音质」差别被大幅隔离。", "link": {"href": "耳机音箱与解码耳放/", "text": "看解码与耳放匹配"}}, "amp": {"title": "耳放 / 功放", "body": "解码出来的模拟信号很弱，耳放提供足够的<b>电压和电流</b>把单元控制住、推响推稳。好不好推看耳机的<b>阻抗和灵敏度</b>。", "link": {"href": "耳机音箱与解码耳放/", "text": "看好不好推"}}, "hp": {"title": "耳机 / 音箱", "body": "电信号最终驱动振膜振动变成声音，是<b>决定音色、也最该先花钱</b>的环节。耳机几乎不受房间影响；音箱和<b>房间一起发声</b>，摆位声学影响常大于换器材。", "link": {"href": "音源数字音频与房间声学/", "text": "看音箱与房间声学"}}, "digital": {"title": "数字输入：USB / 光纤 / 同轴 / 蓝牙", "body": "传<b>数字信号</b>，只要 0/1 不丢，理论音质与线材无关。走蓝牙会先编码压缩，码率和延迟因编码而异。", "link": {"href": "蓝牙编码与无线音频/", "text": "看蓝牙编码与延迟"}}, "analog": {"title": "模拟信号线（DAC → 耳放）", "body": "传连续模拟波形，这一段<b>供电干净、屏蔽到位</b>有意义，但区别通常小于「先把耳机 / 音箱换好」。", "link": {"href": "耳机音箱与解码耳放/", "text": "看解码耳放篇"}}, "driven": {"title": "放大后信号（耳放 → 耳机 / 音箱）", "body": "耳放到单元之间讲究<b>阻抗匹配和接触</b>；音箱功放线材要能过电流、别过长过细。", "link": {"href": "耳机音箱与解码耳放/", "text": "看耳放匹配"}}}</script>
</div>

耳机是和耳朵直接耦合的系统，几乎不受房间影响；音箱则是和**房间一起发声**，摆位和声学处理的影响常常大于换器材。

## 本分类文章

<div class="grid cards" markdown>

-   :material-headphones:{ .lg .middle } __耳机、音箱与解码耳放__

    ---

    单元结构、阻抗 / 灵敏度与「好不好推」、频响与 EQ、解码和耳放怎么匹配。

    [:octicons-arrow-right-24: 进入](耳机音箱与解码耳放.md)

-   :material-ear-hearing:{ .lg .middle } __监听与功能挑选__

    ---

    「监听」是什么、游戏听声辨位、主动降噪 / 通透、TWS 通勤与佩戴怎么选。

    [:octicons-arrow-right-24: 进入](监听与功能挑选.md)

-   :material-bluetooth:{ .lg .middle } __蓝牙编码与无线音频__

    ---

    SBC / AAC / aptX / LDAC 的码率与延迟、无损蓝牙、蓝牙 vs 专用 2.4G。

    [:octicons-arrow-right-24: 进入](蓝牙编码与无线音频.md)

-   :material-waveform:{ .lg .middle } __音源、数字音频与房间声学__

    ---

    采样率 / 位深、高解析是不是噱头、PCM 与 DSD、房间驻波与音箱摆位。

    [:octicons-arrow-right-24: 进入](音源数字音频与房间声学.md)

-   :material-surround-sound:{ .lg .middle } __空间音频、全景声与声场__

    ---

    单声道到环绕、全景声对象、HRTF 头部追踪、声场结像与 eARC 回放。

    [:octicons-arrow-right-24: 进入](空间音频全景声与声场.md)

</div>

!!! tip "怎么用这个分区"
    先点上面交互图建立链路概念，再按需求进文章：想搞懂耳机 / 解码 / 耳放进第一篇，游戏与通勤降噪进第二篇，纠结无线进第三篇，高解析 / DSD / 房间声学进第四篇，全景声与空间音频进第五篇。麦克风、桌面音箱的摆位和设备在「外设」分区，两边互相跳转。

<div class="cross-links" markdown>

[:material-microphone: 麦克风与语音链路（外设）](../外设/麦克风.md){ .md-button }

[:material-speaker: 桌面 / 近场音箱（外设）](../外设/音箱.md){ .md-button }

</div>
