# 网络与组网

家里的网络出问题，最容易变成「重启试试、不行就骂运营商」。其实网络和装机一样，是一条**由近到远、一环扣一环的链路**：你手机 / 电脑里的数据，先经过家里的网线或 Wi-Fi 到路由器，再到光猫，再经过运营商的线路和层层节点，最后才到目标服务器。

只要把这条链路在脑子里建起来，遇到卡顿、转圈、高延迟，就能<span class="hl-key">像排查电脑故障一样「分段定位」，而不是对着一堆灯瞎猜</span>。这一分区讲四件事：入户设备怎么分工、物理线材和网口怎么认、无线怎么覆盖、网速怎么测、问题怎么逐段锁定。

!!! tip "本分区的主线"
    **先分清数据走哪条路（有线 / 无线、内网 / 外网），再用 ping 和测速把问题切到具体某一段。** 设备会换代、运营商套餐会变，但「分段、由近到远、一次只改一个变量」这套方法不会变。

<figure class="figure-svg figure-wide">
<svg viewBox="0 0 900 392" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="家庭网络链路：入户光纤经光猫转换到路由器，路由器再分出有线下联交换机和无线下联AP或Mesh，最终连接有线与无线设备">
  <defs>
    <linearGradient id="nwBase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c4c72"/><stop offset=".5" stop-color="#2c3a59"/><stop offset="1" stop-color="#1c253a"/></linearGradient>
    <linearGradient id="nwSlot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1322"/><stop offset="1" stop-color="#232f4d"/></linearGradient>
    <filter id="nwSoft" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0a1120" flood-opacity=".32"/></filter>
  </defs>

  <!-- 主链三卡 -->
  <rect x="20" y="118" width="156" height="150" rx="14" fill="url(#nwBase)" stroke="#4c5d84" stroke-width="1.5" filter="url(#nwSoft)"/>
  <rect x="70" y="140" width="56" height="46" rx="6" fill="url(#nwSlot)" stroke="#42a5f5" stroke-width="2"/>
  <path d="M 56 150 q 14 -16 14 -2" fill="none" stroke="#42a5f5" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="98" cy="163" r="4" fill="#3fe6d2"/>
  <circle cx="98" cy="163" r="9" fill="none" stroke="#3fe6d2" stroke-width="1.2" opacity=".5"/>
  <text x="98" y="236" text-anchor="middle" font-size="17" font-weight="800" fill="#eef2f9">入户光纤</text>
  <text x="98" y="258" text-anchor="middle" font-size="12.5" fill="#aebbd6">运营商外线 · 光</text>

  <rect x="196" y="118" width="156" height="150" rx="14" fill="url(#nwBase)" stroke="#4c5d84" stroke-width="1.5" filter="url(#nwSoft)"/>
  <path d="M 274 132 l0 18" stroke="#2dd4bf" stroke-width="1.8" stroke-linecap="round"/>
  <rect x="246" y="150" width="56" height="40" rx="6" fill="url(#nwSlot)" stroke="#2dd4bf" stroke-width="2"/>
  <circle cx="258" cy="170" r="2.6" fill="#3fe6d2"/><circle cx="270" cy="170" r="2.6" fill="#ffc233"/><circle cx="282" cy="170" r="2.6" fill="#8895b4"/>
  <line x1="256" y1="182" x2="292" y2="182" stroke="#8895b4" stroke-width="1.4" opacity=".6"/>
  <text x="274" y="236" text-anchor="middle" font-size="17" font-weight="800" fill="#eef2f9">光猫 ONU</text>
  <text x="274" y="258" text-anchor="middle" font-size="12.5" fill="#aebbd6">光↔电 · 可拨号</text>

  <rect x="372" y="118" width="156" height="150" rx="14" fill="url(#nwBase)" stroke="#ffc233" stroke-width="1.8" filter="url(#nwSoft)"/>
  <line x1="426" y1="158" x2="418" y2="138" stroke="#ffc233" stroke-width="2.4" stroke-linecap="round"/>
  <line x1="474" y1="158" x2="482" y2="138" stroke="#ffc233" stroke-width="2.4" stroke-linecap="round"/>
  <rect x="416" y="158" width="68" height="32" rx="9" fill="url(#nwSlot)" stroke="#ffc233" stroke-width="2"/>
  <circle cx="450" cy="174" r="2.8" fill="#3fe6d2"/>
  <text x="450" y="236" text-anchor="middle" font-size="17" font-weight="800" fill="#eef2f9">路由器</text>
  <text x="450" y="258" text-anchor="middle" font-size="12.5" fill="#aebbd6">拨号 · NAT · Wi-Fi</text>

  <!-- 右上：有线 -->
  <rect x="560" y="34" width="156" height="150" rx="14" fill="url(#nwBase)" stroke="#4c5d84" stroke-width="1.5" filter="url(#nwSoft)"/>
  <rect x="604" y="60" width="68" height="34" rx="6" fill="url(#nwSlot)" stroke="#2dd4bf" stroke-width="2"/>
  <g fill="#3fe6d2"><rect x="610" y="70" width="8" height="8" rx="1.5"/><rect x="622" y="70" width="8" height="8" rx="1.5"/><rect x="634" y="70" width="8" height="8" rx="1.5"/><rect x="646" y="70" width="8" height="8" rx="1.5"/><rect x="658" y="70" width="8" height="8" rx="1.5"/></g>
  <text x="638" y="149" text-anchor="middle" font-size="17" font-weight="800" fill="#eef2f9">交换机</text>
  <text x="638" y="171" text-anchor="middle" font-size="12.5" fill="#aebbd6">扩展有线网口</text>

  <rect x="732" y="34" width="156" height="150" rx="14" fill="url(#nwBase)" stroke="#4c5d84" stroke-width="1.5" filter="url(#nwSoft)"/>
  <rect x="782" y="58" width="52" height="34" rx="5" fill="url(#nwSlot)" stroke="#42a5f5" stroke-width="2"/>
  <rect x="800" y="92" width="16" height="8" rx="2" fill="url(#nwSlot)" stroke="#42a5f5" stroke-width="1.6"/>
  <rect x="786" y="100" width="44" height="5" rx="2.5" fill="#42a5f5" opacity=".7"/>
  <text x="810" y="149" text-anchor="middle" font-size="17" font-weight="800" fill="#eef2f9">有线设备</text>
  <text x="810" y="171" text-anchor="middle" font-size="12.5" fill="#aebbd6">电脑 · NAS · 电视</text>

  <!-- 右下：无线 -->
  <rect x="560" y="204" width="156" height="150" rx="14" fill="url(#nwBase)" stroke="#4c5d84" stroke-width="1.5" filter="url(#nwSoft)"/>
  <circle cx="638" cy="262" r="6" fill="#2dd4bf"/>
  <path d="M 622 254 a 22 22 0 0 1 32 0" fill="none" stroke="#2dd4bf" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 612 246 a 36 36 0 0 1 52 0" fill="none" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round" opacity=".55"/>
  <text x="638" y="319" text-anchor="middle" font-size="17" font-weight="800" fill="#eef2f9">AP / Mesh</text>
  <text x="638" y="341" text-anchor="middle" font-size="12.5" fill="#aebbd6">扩展无线覆盖</text>

  <rect x="732" y="204" width="156" height="150" rx="14" fill="url(#nwBase)" stroke="#4c5d84" stroke-width="1.5" filter="url(#nwSoft)"/>
  <rect x="788" y="230" width="22" height="38" rx="4" fill="url(#nwSlot)" stroke="#ff7043" stroke-width="2"/>
  <line x1="799" y1="263" x2="799" y2="267" stroke="#ff7043" stroke-width="1.6"/>
  <polygon points="824,244 852,236 852,262" fill="url(#nwSlot)" stroke="#ff7043" stroke-width="2" stroke-linejoin="round"/>
  <rect x="820" y="262" width="38" height="6" rx="2" fill="#ff7043" opacity=".7"/>
  <text x="810" y="319" text-anchor="middle" font-size="17" font-weight="800" fill="#eef2f9">无线设备</text>
  <text x="810" y="341" text-anchor="middle" font-size="12.5" fill="#aebbd6">手机 · 本 · 智能家居</text>

  <!-- 连接箭头 -->
  <line x1="176" y1="193" x2="192" y2="193" stroke="#42a5f5" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/><polygon points="196,193 187,187 187,199" fill="#42a5f5"/>
  <line x1="352" y1="193" x2="368" y2="193" stroke="#2dd4bf" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/><polygon points="372,193 363,187 363,199" fill="#2dd4bf"/>
  <path d="M 528 182 Q 544 150 556 116" fill="none" stroke="#2dd4bf" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/><polygon points="560,109 549,114 558,123" fill="#2dd4bf"/>
  <path d="M 528 204 Q 544 238 556 272" fill="none" stroke="#ff7043" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/><polygon points="560,279 550,270 559,266" fill="#ff7043"/>
  <line x1="716" y1="109" x2="728" y2="109" stroke="#2dd4bf" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/><polygon points="732,109 723,103 723,115" fill="#2dd4bf"/>
  <line x1="716" y1="279" x2="728" y2="279" stroke="#ff7043" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/><polygon points="732,279 723,273 723,285" fill="#ff7043"/>

  <!-- 介质标签 -->
  <rect x="150" y="160" width="72" height="20" rx="10" fill="var(--md-default-bg-color)" stroke="#42a5f5" stroke-opacity=".45" stroke-width="1"/>
  <text x="186" y="174" text-anchor="middle" font-size="12" font-weight="700" fill="var(--md-default-fg-color--light)">光纤（光）</text>
  <rect x="328" y="160" width="74" height="20" rx="10" fill="var(--md-default-bg-color)" stroke="#2dd4bf" stroke-opacity=".45" stroke-width="1"/>
  <text x="365" y="174" text-anchor="middle" font-size="12" font-weight="700" fill="var(--md-default-fg-color--light)">网线 WAN</text>
  <rect x="520" y="138" width="86" height="20" rx="10" fill="var(--md-default-bg-color)" stroke="#2dd4bf" stroke-opacity=".45" stroke-width="1"/>
  <text x="563" y="152" text-anchor="middle" font-size="12" font-weight="700" fill="var(--md-default-fg-color--light)">网线 LAN / 回程</text>
  <rect x="528" y="232" width="76" height="20" rx="10" fill="var(--md-default-bg-color)" stroke="#ff7043" stroke-opacity=".45" stroke-width="1"/>
  <text x="566" y="246" text-anchor="middle" font-size="12" font-weight="700" fill="var(--md-default-fg-color--light)">Wi-Fi 无线</text>
</svg>
<figcaption>家庭网络的完整链路：户外光纤进光猫（光转电、可拨号），再交给路由器做拨号 / NAT / 分配地址并发出 Wi-Fi；路由器是「内」与「外」的分界——往下，有线设备经交换机扩展网口接入，无线设备经 AP / Mesh 节点接入。排障时数据从右往左、从设备回到互联网，断在哪一段，问题就出在哪一段。</figcaption>
</figure>

<div class="grid cards" markdown>

-   :material-router-network:{ .lg .middle } __入户、光猫与路由器__

    ---

    光纤怎么进家、光猫和路由器各管什么、桥接与拨号、路由器 / 交换机 / AP / Mesh 怎么选、大户型怎么覆盖。

    [:octicons-arrow-right-24: 进入](入户光猫与路由器.md)

-   :material-lan:{ .lg .middle } __网线、光纤与网口__

    ---

    Cat5e / Cat6 / Cat6a 分别能跑多快、怎么用眼和手识别网线、水晶头线序、光纤和 SFP+、2.5G / 万兆内网怎么搭。

    [:octicons-arrow-right-24: 进入](网线光纤与网口.md)

-   :material-wifi:{ .lg .middle } __无线 Wi-Fi：频段与覆盖__

    ---

    2.4G / 5G / 6GHz 各适合什么、Wi-Fi 几代怎么看、协商速率为什么要打折、信号强度、信道拥堵与 Mesh 回程。

    [:octicons-arrow-right-24: 进入](无线WiFi.md)

-   :material-speedometer:{ .lg .middle } __网速、测速与排障__

    ---

    兆比特和兆字节怎么换算、怎么测速才算准、ping / 丢包 / 抖动是什么、用一条命令把问题定位到内网、运营商还是服务器。

    [:octicons-arrow-right-24: 进入](网速测速与排障.md)

</div>

## 常见名词 / 缩写（先看这里）

组网圈长期混用中英文和单位，先把高频词统一注释，正文里不再反复解释。

=== "速率与单位"

    | 名词 | 含义 |
    | --- | --- |
    | **Mbps / Gbps** | 兆比特每秒 / 吉比特每秒，描述**带宽和链路速率**；1 Gbps = 1000 Mbps |
    | **MB/s** | 兆字节每秒，描述**实际看到的下载速度**；1 字节 = 8 比特，所以千兆宽带理论峰值约 125 MB/s，扣除开销通常 110 MB/s 上下 |
    | **百兆 / 千兆 / 2.5G / 万兆** | 100 Mbps / 1000 Mbps / 2500 Mbps / 10 Gbps，整条链路按**最慢的一环**跑 |
    | **协商速率** | 网卡和对端设备实际握手成功的速率（如显示 1.0 Gbps、1200 Mbps），是「当前连接能力」，不等于测速结果 |
    | **延迟（ping / latency）** | 一个数据包往返的时间，单位毫秒 ms，游戏和视频通话最敏感 |
    | **丢包（loss）** | 发出的包有多少比例没回来，用百分比表示；丢包会表现为卡顿、瞬移、语音断裂 |
    | **抖动（jitter）** | 每次延迟之间的波动大小，抖动大时即使平均延迟不高也会一卡一卡 |

=== "设备"

    | 名词 | 含义 |
    | --- | --- |
    | **光猫（ONU / ONT）** | 把入户光纤里的**光信号转换成网线上的电信号**，运营商提供，常自带拨号、路由和 Wi-Fi |
    | **路由器（Router）** | 负责拨号 / 分配内网地址（DHCP）、把多台设备共享一条宽带（NAT）、提供有线网口和 Wi-Fi |
    | **交换机（Switch）** | 只负责把多个有线网口接到同一局域网、在设备间转发数据，**不负责拨号和分配地址** |
    | **AP（无线接入点）** | 只负责发出 Wi-Fi 信号、把无线设备接入网络，常和路由器 / AC 配合做全屋覆盖 |
    | **Mesh（组网 / 子母路由）** | 多个同系列节点自动组成一张网、设备在节点间漫游，适合大户型 |
    | **NAS** | 联网存储，一块（或多块）专门放文件 / 备份 / 影音的网络硬盘，是组高速内网的常见理由 |

=== "链路与诊断"

    | 名词 | 含义 |
    | --- | --- |
    | **WAN / LAN** | WAN 口连「外面」（光猫 / 进线），LAN 口连「家里设备」；路由器正是内外的分界 |
    | **网关（Gateway）** | 你这台设备出门要找的第一站，通常就是路由器内网地址，常见 `192.168.1.1` / `192.168.0.1` |
    | **内网 IP / 公网 IP** | 家里设备是路由器分配的内网地址；公网 IP 是运营商给你、在整个互联网上被找到的地址，多数家庭宽带没有固定公网 IP |
    | **DHCP** | 路由器自动给每台设备分配内网 IP 的服务 |
    | **NAT** | 让家里几十台设备共用一个公网 IP 出门的技术 |
    | **PPPoE 拨号** | 用运营商给的宽带账号密码「拨通」上网的过程，可由光猫或路由器执行 |
    | **DNS** | 把「网址」翻译成「服务器 IP」的服务，DNS 故障常表现为能上 QQ / 能 ping 通 IP 却打不开网页 |

!!! note "和「电脑」分区是连着的"
    主板上的网口、板载 Wi-Fi、以及加装的 **2.5G / 万兆有线网卡、PCIe / M.2 无线网卡**，是这条链路在电脑里的那一段；它们插哪根 PCIe 槽、实际能跑几速、是否和 M.2 共享通道，在《[电脑 · 硬件](../电脑/装机/硬件.md)》的主板接口与 PCIe 章节讲。本分区负责「网卡之外的整张网」。
