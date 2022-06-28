# gd-tax-plugin
![](https://img.shields.io/static/v1?label=version&message=v1.0.4&color=red)
![](https://img.shields.io/badge/language-JavaSript-brightgreen.svg)
![](https://img.shields.io/static/v1?label=license&message=MIT&color=blue)
![](https://img.shields.io/static/v1?label=Baseon&message=Tampermonkey&color=important)

一个基于Tampermonkey的广东税务系统辅助插件，方便多账号管理（会计）。
***

## How to use?
### 1. Install TamperMonkey（support 360/EDGE/Chrome...）
安装方法搜索引擎很多，不赘述。(推荐中国的小伙伴使用Edge浏览器，可以直接商店下载安装。)

### 2. Install Script
https://greasyfork.org/scripts/443095-gd-tax-plugin/code/gd-tax-plugin.user.js

## :warning: excel的数据格式
- 工作表名：客户信息表
- 标题名：公司名称，统一信用代码，实名账号，密码
![excel的数据格式](https://github.com/Dengguiling/gd-tax-plugin/blob/master/sample.png)

## Todo
- [X] 跳过通知框，切换到密码登录界面。
- [X] 在excel中复制登录信息，然后在登录框粘贴自动解析填充。
- [X] 将excel中的登录信息存储到浏览器数据库，直接在浏览器搜索，不用打开excel。
- [X] 登录后在首页显示常用图标，无需每个客户都添加。

# License
[MIT © GREENYYY](./LICENSE)