// ==UserScript==
// @name         gd-tax-plugin
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  广东电子税局多账号管理插件
// @author       Dengguiling
// @license      MIT
// @match        https://etax.guangdong.chinatax.gov.cn/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      https://cdn.staticfile.org/xlsx/0.10.0/xlsx.core.min.js
// ==/UserScript==

//excel坐标
function getExcelPos(row, col) {
    var pos = ""

    while (col) {
        if (col <= 26) {
            pos += String.fromCharCode(65+col-1);
            break;
        } else {
            pos += 'A';
            col -= 26;
        }
    }
    pos += row + '';
    return pos;
}

// csv转sheet对象
function csv2sheet(csv) {
	var sheet = {}; // 将要生成的sheet
	row = csv.split('\n');
	row.forEach(function(r, i) {
		col = r.split(',');
		if(i == 0) sheet['!ref'] = 'A1:'+ getExcelPos(row.length, col.length);
		col.forEach(function(val, j) {
			sheet[getExcelPos(i+1, j+1)] = {v: val};
		});
	});
	return sheet;
}

// 将一个sheet转成最终的excel文件的blob对象，然后利用URL.createObjectURL下载
function sheet2blob(sheet, sheetName) {
    sheetName = sheetName || 'sheet1';
    var workbook = {
        SheetNames: [sheetName],
        Sheets: {}
    };
    workbook.Sheets[sheetName] = sheet; // 生成excel的配置项

    var wopts = {
        bookType: 'xlsx', // 要生成的文件类型
        bookSST: false, // 是否生成Shared String Table，官方解释是，如果开启生成速度会下降，但在低版本IOS设备上有更好的兼容性
        type: 'binary'
    };
    var wbout = XLSX.write(workbook, wopts);
    var blob = new Blob([s2ab(wbout)], {
        type: "application/octet-stream"
    }); // 字符串转ArrayBuffer
    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }
    return blob;
}

function openDownloadDialog(url, saveName) {
    if (typeof url == 'object' && url instanceof Blob) {
        url = URL.createObjectURL(url); // 创建blob地址
    }
    var aLink = document.createElement('a');
    aLink.href = url;
    aLink.download = saveName || ''; // HTML5新增的属性，指定保存文件名，可以不要后缀，注意，file:///模式下不会生效
    var event;
    if (window.MouseEvent) event = new MouseEvent('click');
    else {
        event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    }
    aLink.dispatchEvent(event);
}

/* -------------------------- 搜索框库代码 -------------------------- */
/**
* 搜索框初始化
* @param option: 初始化参数
* @return void
*/
$.fn.searchInit = function (option) {
    /* 默认配置 */
    var setting = $.extend({
        data: "",               // 选择框数据
        emptyTips: "暂无数据",    // 无数据提醒
        placeholder: "搜索公司名称",
        width: "300px",
        height: "36px"
    }, option);

    function updateList(data, emptyTips) {
        if ($this.find(".searchInput").attr("readonly") != "readonly") {
            var html = "";
            if (data && data.length > 0) {
                for (var i = 0; i < data.length && i < 20; i++) {
                    html += '<li style="position: relative; z-index:999; background-color: white;>' + data[i].name + "</li>"
                }
            } else {
                html += '<li class="searchSelectorEmpty" style="position: relative; z-index:999; background-color: white;>' + emptyTips + "</li>"
            }
            $this.find(".searchSelectorList").empty().append(html)
        }
    }

    var id = "#" + this.attr("id");
    var $this = this;
    var data = setting.data;
    var emptyTips = setting.emptyTips;
    var width = setting.width;
    var height = setting.height;
    if ($this.html().replace(/(^\s*)|(\s*$)/g, "") != "") {
        updateList(data, setting.emptyTips);
    } else {
        $this.append('<input class="searchInput" style="width: ' + width + ';" placeholder="' + setting.placeholder + ' "/>');
        $this.append('<ul class="searchSelectorList hide " style="background: white;"></ul>');

        updateList(data, emptyTips);

        /* 清空下拉选择项，并设置高度和宽度。 */
        $this.find(".searchSelectorList").empty().css({
            "width": $this.find(".searchInput").outerWidth() + "px",
            "top": $this.find(".searchInput").outerHeight() + "px"
        })
    }

    /* CSS: 选择时更容易看出鼠标位置。 */
    $(".searchSelectorList li").mouseover(function(e) {
        $(this).css("background-color","silver");
    })
    $(".searchSelectorList li").mouseout(function(e) {
        $(this).css("background-color","white");
    })

    // $('<input class="searchInput" style="width: ' + width + '; font-size: 10px;" placeholder="' + setting.placeholder + '"/>').insertBefore($(".list a:first"));

    /* 初始化下拉选择框点击事件 */
    $this.searchSelectorClick();

    /* 绑定点击事件：点击其它地方时隐藏选择框。 */
    $(document).click(function (event) {
        var _con = $(id + " .searchInput");
        if (!_con.is(event.target) && _con.has(event.target).length === 0) {
            $(id + " .searchSelectorList").hide()
        }
    })

};

/**
* 更新下拉选择框列表
* @param data: 下拉选择数据
* @param emptyTips: 无数据时，显示提示
* @param callback: 回调函数
* @return void
*/
$.fn.updatesearchSelectorList = function (data, emptyTips, callback) {
    var $this = this;
    emptyTips = emptyTips ? emptyTips : "暂无数据";    // 默认：暂无数据

    /* 构建下拉选择框的HTML */
    var html = "";
    if (data && data.length > 0) {
        for (var i = 0; i < data.length; i++)
            html += '<li style="position: relative; z-index:999; background-color: white;">' + data[i].name + "</li>";
    } else {
        html += '<li class="searchSelectorEmpty" style="position: relative; z-index:999; background-color: white;">' + emptyTips + "</li>";
    }
    $this.find(".searchSelectorList").html(html).show();

    /* CSS: 选择时更容易看出鼠标位置。 */
    $(".searchSelectorList li").mouseover(function(e) {
        $(this).css("background-color","silver");
    })
    $(".searchSelectorList li").mouseout(function(e) {
        $(this).css("background-color","white");
    })

    if (typeof (callback) == "function")
        callback();
};

/**
* 搜索输入框点击事件
* @param callback: 回调函数
* @return void
*/
$.fn.searchInputClick = function (callback) {
    this.delegate(".searchInput", "click", function (e) {
        if (typeof (callback) == "function") callback(e);
    })
};

/**
* 搜索输入框输入事件
* @param callback: 回调函数
* @return void
*/
$.fn.searchInputKeyup = function (callback) {
    this.delegate(".searchInput", "keyup", function (e) {
        if (typeof (callback) == "function") callback(e);
    })
};

/**
* 下拉选择框点击事件
* @param callback: 回调函数
* @return void
*/
$.fn.searchSelectorClick = function (callback) {
    var $this = this;
    /* 将所有的下来框都绑定事件 */
    $this.find("ul.searchSelectorList").delegate("li", "click", function (e) {
        var $input = $this.find(".searchInput");

        /* 禁用默认事件（兼容不同浏览器 */
        if (e && e.preventDefault)
            e.preventDefault()
        else
            window.event.returnValue = false;
        if (e.stopPropagation)
            e.stopPropagation()
        else
            e.cancelBubble = true;

        /* 无数据直接返回 */
        if ($(this).hasClass("searchSelectorEmpty")) return;

        /* 隐藏下拉框 */
        $this.find(".searchSelectorList").hide();
        /* 更新选择的数据到搜索框 */
        $input.val($(this).text());

        /* 回调函数，继续处理。 */
        if (typeof (callback) == "function") callback(e);
    })
};

/* -------------------------- xlsx库代码 -------------------------- */
/**
* 读取本地excel文件
* @param file: 读取数据的Excel文件
* @param callback: 回调函数
* @return void
*/
function read_workbook_from_local_file(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var data = e.target.result;
        var workbook = XLSX.read(data, {type: 'binary'});

        /* 校验工作表名称是否正确 */
        var sheetNames = workbook.SheetNames;
        if (sheetNames.indexOf("客户信息表") == -1) {
            alert("导入数据库失败：请确认工作表名是否为 客户信息表 !");
            return ;
        }

        var worksheet = workbook.Sheets["客户信息表"];
        var csv = XLSX.utils.sheet_to_csv(worksheet);
        var accountData = csv.split("\n");
        var title = accountData.shift();
        title = title.split(",");

        /* 校验Excel标题名称是否正确 */
        if (title.indexOf("公司名称") == -1) {
            alert("导入数据库失败：没找到标题 公司名称！");
            return ;
        }
        if (title.indexOf("统一信用代码") == -1) {
            alert("导入数据库失败：没找到标题 统一信用代码！");
            return ;
        }
        if (title.indexOf("实名账号") == -1) {
            alert("导入数据库失败：没找到标题 实名账号！");
            return ;
        }
        if (title.indexOf("密码") == -1) {
            alert("导入数据库失败：没找到标题 密码！");
            return ;
        }

        /* 解析数据。并存入数据库。 */
        var count = 0;
        var re = RegExp("^[A-Za-z0-9]{18}$");
        accountData.forEach(data => {
            var ds = data.split(",");
            if (ds[title.indexOf("统一信用代码")]) {
                if (re.test(ds[title.indexOf("统一信用代码")].replace(/[ ]|[\r\n]/g,""))) {
                    write_database(
                        "account",
                        ds[title.indexOf("公司名称")],      // 公司名称
                        [
                            ds[title.indexOf("统一信用代码")],  // 统一信用代码
                            ds[title.indexOf("实名账号")],      // 账户名
                            ds[title.indexOf("密码")]          // 密码
                        ]
                    );
                    count++;
                }
            }
        });

        /* 回调函数，继续处理。 */
        if (typeof (callback) == "function") callback(e);

        alert("成功导入 " + count + " 个数据！");
    };

    reader.readAsBinaryString(file);
}

/* -------------------------- GM数据库代码 -------------------------- */
/**
* 写入Tampermonkey的GM数据库
* @param data: 写入数据库的数据
* @return void
*/
function write_database(type, key, data) {
    // var key = data.shift();
    // if (!key) return ;
    var keys = GM_getValue(type);
    if (!keys) keys = {};
    keys[key] = data;
    console.log(type, keys);
    GM_setValue(type, keys);
}

/**
* 删除Tampermonkey的GM数据库
* @return void
*/
function delete_database(del_key, skip_confirm) {
    if (skip_confirm || confirm("【!!!】确认清空数据库吗？")) {
        var keys = GM_listValues();
        console.log(keys, del_key);
        keys.forEach(key => {
            if (del_key === key)
                GM_deleteValue(key);
        });
    }
}

/**
* 在Tampermonkey的GM数据库中搜索
* @param data: 从数据库中搜索的键值
* @return void
*/
function searchDatabase(type, data, callback) {
    var keys = GM_getValue(type);
    if (keys) {
        for (var key in keys) {
            if (key.indexOf(data) >= 0) {
                if (callback)
                    callback(keys[key]);
                return keys[key];
            }
        }
    }
}

function fillAccountData(accountData) {
        document.getElementById("shxydmOrsbh").value = accountData[0];
        document.getElementById("userNameOrSjhm").value = accountData[1];
        document.getElementById("passWord").value = accountData[2];
}

function getAllCompany() {
    var data = []
    var keys = GM_getValue("account");
    if (keys) {
        for (var key in keys) {
            data.push({"name": key});
        }
    }
    return data;
}
/* ------------------------------------------------------------------------- */


(function() {
    'use strict';

    var url = document.location.toString();
    console.log(url);
    if (url === "https://etax.guangdong.chinatax.gov.cn/xxmh/" ||
        url === "https://etax.guangdong.chinatax.gov.cn/xxmh/html/index.html")
    {
        /* 跳转到登录页面 */
        $(".layui-layer-btn2:first").click();
        $(".loginico:first").click();
    }
    else if (url.indexOf("https://etax.guangdong.chinatax.gov.cn/sso/login") == 0)
    {
        /* 功能1: 自动切换到登录页面的密码登录框。 */
        $(".layui-layer-btn1:first").click();
        document.getElementById("mmdl_QieHuan").click();

        /* 功能2：从excel中复制信用代码，账号，密码之后，在输入框粘贴自动填充。 */
        document.body.onpaste = function(event) {
            var clipboardData = (event.clipboardData || window.clipboardData);
            /* 没有数据直接返回 */
            if (!clipboardData) return ;
            /* 解析粘贴数据 */
            var accountData = clipboardData.getData("text").trim().split(/\s+/);
            /* 填充登录信息 */
            if (accountData.length == 3) {
                setTimeout(function(){
                    fillAccountData(accountData);
                }, 100);
            }
        }

        /* 功能3：将需要管理的税务账号从Excel中导入数据库，后面就无需打开Excel文件，直接搜索。 */
        var data = [];

        /* 调整顶栏样式 */
        $(".layui-row:first").attr("style", "display: flex;align-items: baseline;gap: 10px;");

        /* 按钮：删除数据库，用于清除缓存 */
        $('<button id="clear_db" style="font-size: 14px;width: 100px;">清除缓存</button>').insertBefore($(".layui-row .layui-col-md3:first"));
        $("#clear_db").click(function(e) {
            delete_database("account");     // 删除数据库
            $("#file").val("");    // 清空打开文件框的值，下次打开同一文件时依然解析。
            data = [];             // 清空缓存
        })

        /* 按钮：刷新数据库，通过按钮触发文件框，然后打开excel文件读取。 */
        $('<input type="file" id="file" style="display:none;">').insertBefore($(".layui-row .layui-col-md3:first"));
        $('<button id="open_file" style="font-size: 14px;width: 100px;">导入数据</button>').insertBefore($(".layui-row .layui-col-md3:first"));
        $("#open_file").click(function(e) {
            $("#file").click();
        });
        $("#file").change(function(e){
            var files = e.target.files;
            /* 没有打开文件（点击了取消），直接返回。 */
            if(files.length == 0) return;

            /* 校验文件后缀名，仅测试过xlsx文件！ */
            if(!/\.xlsx/g.test(files[0].name)) {
                alert('仅支持读取xlsx格式文件！');
                return;
            }

            /* 读取Excel文件 */
            read_workbook_from_local_file(files[0], function () {
                /* 每次更新数据库都需要刷新data数组 */
                data = getAllCompany();
                console.log(data.length, data);

                /* 删除文件选择框的值，下次打开同一文件依然解析。 */
                $("#file").val("");
            });
        });

        /* 搜索框 */
        $('<div id="search" style="font-size: 14px;"></div>').insertBefore($(".layui-row .layui-col-md3:first"));

        /* 搜索框控制代码 */
        console.log(GM_listValues());

        /* 初始化data数组（存放搜索关键字：公司名称） */
        data = getAllCompany();

        /* 搜索框初始化 */
        $('#search').searchInit();

        /* 绑定搜索框点击事件 */
        $('#search').searchInputClick(function () {
            var searchData = [];

            /* 搜索需要搜索的键值 */
            for (var i = 0; i < data.length; i++) {
                /* 最大限制下拉选择框显示20个结果，太多结果证明搜索词不够准确。 */
                if (searchData.length >= 20) break;

                if ($(".searchInput:first").val()) {
                    /* 对比成功的话就插入到searchData */
                    if (data[i].name.indexOf($(".searchInput:first").val()) >= 0)
                        searchData.push(data[i]);
                } else {
                    /* 没有输入就随便插入。 */
                    searchData.push(data[i]);
                }
            }
            /* 将搜索结果生成下拉选择框 */
            $('#search').updatesearchSelectorList(searchData, "暂无数据");
        });

        /* 绑定搜索框输入事件 */
        $('#search').searchInputKeyup(function (e) {
            var searchData = [];
            /* 搜索需要搜索的键值 */
            for (var i = 0; i < data.length; i++) {
                /* 最大限制下拉选择框显示20个结果，太多结果证明搜索词不够准确。 */
                if (searchData.length >= 20) break;

                if ($(".searchInput:first").val()) {
                    /* 对比成功的话就插入到searchData */
                    if (data[i].name.indexOf($(".searchInput:first").val()) >= 0)
                        searchData.push(data[i]);
                } else {
                    /* 没有输入就随便插入。 */
                    searchData.push(data[i]);
                }
            }
            /* 将搜索结果生成下拉选择框 */
            $('#search').updatesearchSelectorList(searchData, "暂无数据");

            if (searchData.length) {
                let theEvent = e || window.event;
                let keyCode = theEvent.keyCode || theEvent.which || theEvent.charCode;
                /* 回车选择第一个搜索结果 */
                if (keyCode == 13) {
                    searchDatabase("account", searchData[0]["name"], function (accountData) {
                        fillAccountData(accountData);
                    });
                }
            }
        });

        /* 绑定下拉框点击事件，选择某家公司时，自动填充账户信息。 */
        $('#search').searchSelectorClick(function () {
            searchDatabase("account", $(".searchInput:first").val(), function (accountData) {
                fillAccountData(accountData);
            });
        });
    } else if (url === "https://etax.guangdong.chinatax.gov.cn/xxmh/html/index_login.html") {
        /* 功能4：添加自定义图标。无需每个客户都添加。 */
        setTimeout(function(){
            var addItem;

            /* 违法违章查询 */
            addItem = $('#topTabs > div.layui-tab-content > div:nth-child(4) > div > div > div:nth-child(12)').clone(true);
            $('#cygnsz').after(addItem);

            /* 纳税信用状态信息查询 */
            addItem = $('#topTabs > div.layui-tab-content > div:nth-child(4) > div > div > div:nth-child(11)').clone(true);
            $('#cygnsz').after(addItem);

            /* 发票查询 */
            addItem = $('#topTabs > div.layui-tab-content > div:nth-child(4) > div > div > div:nth-child(3)').clone(true);
            $('#cygnsz').after(addItem);

            /* 一户式查询 */
            addItem = $('#topTabs > div.layui-tab-content > div:nth-child(4) > div > div > div:nth-child(1)').clone(true);
            $('#cygnsz').after(addItem);

            /* 纳税人信息 */
            addItem = $('#topTabs > div.layui-tab-content > div:nth-child(2) > div > div > div:nth-child(1)').clone(true);
            $('#cygnsz').after(addItem);

            /* 事项办理 */
            addItem = $('#topTabs > div.layui-tab-content > div:nth-child(3) > div > div > div:nth-child(1)').clone(true);
            $('#cygnsz').after(addItem);

            /* 税费申报 */
            addItem = $('#topTabs > div.layui-tab-content > div:nth-child(3) > div > div > div:nth-child(4)').clone(true);
            $('#cygnsz').after(addItem);
        }, 100);
    } else if (url.indexOf("/xxmh/service/um/cxpt/4thLvlFunTabsInit.do?cdId=961&gnDm=userMessage.qyxx&gdslxDm=3") != -1) {
        $('<button id="download" style="font-size: 14px; margin-left: 10px;">保存到EXCEL</button>').insertAfter($("#gnmc li")[$("#gnmc li").length-1]);
        $("#download").click(function(e) {
            $("#gnmc").find("li").each(function () {
                if ($(this).hasClass('layui-this')) {
                    var csv = searchDatabase("nsrxx", $(this).text());
                    if(csv)
                        openDownloadDialog(sheet2blob(csv2sheet(csv)), "纳税人信息.xlsx");
                    else
                        alert("当前脚本没获取到数据，请稍后再重试点击！");
                }
            });
        });

        /* 每次打开先清空数据库 */
        delete_database("nsrxx", true);
    } else if (url.indexOf("/web-tycx/sscx/yhscx/swdjcx/jcxx/dwnsrxx.jsp?sxqybz=Y&gdlxbz=GS") != -1) {
        /* 抓取信息 */
        setTimeout(function(){
            var csv = ""
            var jbxx_title = "";
            var jbxx = "";
            var count = 0;
            $('#dwnsrjbxx .searchTable:first table:eq(0)').find("tr").each(function () {
                $(this).find('td').each(function () {
                    if (!(count % 2)) jbxx_title += $(this).text().replace('：', '') + ',';
                    else jbxx += $(this).text() + ',';
                    count++;
                });
            });
            csv += jbxx_title + '\n' + jbxx + '\n\n';

            var title = ""
            var djztxx_title = "";
            var djztxx = "";
            $('#dwnsrjbxx .searchTable:first table:eq(1)').find("tr").each(function () {
                $(this).find('th').each(function () {
                    title += $(this).text() + ',';
                });
                $(this).find('td').each(function () {
                    djztxx += $(this).text() + ',';
                });
                if ($(this).find('td').length)
                    djztxx_title += title;
            });
            csv += djztxx_title + '\n' + djztxx + '\n\n';

            var tz_title = "";
            var tz = "";
            $('#dwnsrjbxx .searchTable:first table:eq(2)').find("tr").each(function () {
                if ($(this).find('th').length) {
                    tz_title += "注册资本,";
                    tz += ',';
                }
                $(this).find('th').each(function () {
                    tz_title += $(this).text() + ',';
                });
                $(this).find('td').each(function () {
                    tz += $(this).text() + ',';
                });
            });
            $('#dwnsrjbxx .searchTable:first table:eq(3)').find("tr").each(function () {
                if ($(this).find('th').length) {
                    tz_title += "投资总额,";
                    tz += ',';
                }
                $(this).find('th').each(function () {
                    tz_title += $(this).text() + ',';
                });
                $(this).find('td').each(function () {
                    tz += $(this).text() + ',';
                });
            });
            $('#dwnsrjbxx .searchTable:first table:eq(4)').find("tr").each(function () {
                $(this).find('th').each(function () {
                    tz_title += $(this).text() + ',';
                });
                $(this).find('td').each(function () {
                    tz += $(this).text() + ',';
                });
            });
            csv += tz_title + '\n' + tz + '\n\n';

            var jg_title = "";
            var jg = ",";
            $('#dwnsrjbxx .searchTable:first table:eq(6)').find("tr").each(function () {
                $(this).find('th').each(function () {
                    jg_title += $(this).text() + ',';
                });
                $(this).find('td').each(function () {
                    jg += $(this).text() + ',';
                });
            });
            count = 0;
            $('#dwnsrjbxx .searchTable:first table:eq(7)').find("tr").each(function () {
                $(this).find('th').each(function () {
                    jg_title += $(this).text() + ',';
                    jg += ',';
                });
                $(this).find('td').each(function () {
                    if (!(count % 2)) jg_title += $(this).text() + ',';
                    else jg += $(this).text() + ',';
                    count++;
                });
            });
            count = 0;
            $('#dwnsrjbxx .searchTable:first table:eq(8)').find("tr").each(function () {
                $(this).find('td').each(function () {
                    if (!(count % 2)) jg_title += $(this).text() + ',';
                    else jg += $(this).text() + ',';
                    count++;
                });
            });
            csv += jg_title + '\n' + jg + '\n\n';
            write_database("nsrxx", "注册信息", csv);
        }, 1000);
    } else if (url.indexOf("/xxmh/view/userMessage/qyxx/djxx/dwnsrxx.jsp?gdsbz=1") != -1) {
        /* 抓取信息 */
        setTimeout(function(){
            var csv = ""
            var jbxx_title = "";
            var jbxx = "";
            var count = 0;
            $('#dwnsrjbxx .layui-table:first table:eq(0)').find("tr").each(function () {
                $(this).find('td').each(function () {
                    if (!(count % 2)) jbxx_title += $(this).text().replace(':', '') + ',';
                    else jbxx += $(this).text() + ',';
                    count++;
                });
            });
            csv += jbxx_title + '\n' + jbxx + '\n\n';

            var swjg_title = "";
            var swjg = "";
            $('#dwnsrjbxx .layui-table:first table:eq(3)').find("tr").each(function () {
                $(this).find('td').each(function () {
                    if (!(count % 2)) swjg_title += $(this).text().replace(':', '') + ',';
                    else swjg += $(this).text() + ',';
                    count++;
                });
            });
            csv += swjg_title + '\n' + swjg + '\n\n';
            write_database("nsrxx", "登记信息", csv);
        }, 1000);
    }
})();