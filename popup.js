var host_index = "https://store.onyx-international.com";

function setStoreCookieToken(token){
	chrome.cookies.set({url:host_index, name:"token", value:token});
}

function getStoreCookieToken(callback, n){
	return chrome.cookies.get({url:host_index, name:"token"}, function(cookie){
		callback(cookie, n);
	});
}

function removeStoreCookieToken(){
	chrome.cookies.remove({url:host_index, name:"token"});
}

var login_info =
{
    "username": "",
    "device_ids": [],
    "email":"",
    "token":""
};

$(document).ready(function(){

	$("#btn_ok").click(function(){
		var email = $("#email").val();
		var password = $("#password").val();
		var data = {
			email:email,
			password:password
		};
		$("#btn_ok").attr("disabled",true);
		$("#error_msg").hide();
		$.ajax({
             type: "POST",
             url: "https://store.onyx-international.com/api/1/account/signin",
             contentType:'application/json; charset=UTF-8',
    		 data: JSON.stringify(data),
             dataType: "json",
             success: function(data){
                 $("#error_msg").hide();
                 $("#btn_ok").attr("disabled",false);
                 initData(data);
                 welcome();
                 synchronizedToStore();
             },
             error:function(data){
             	$("#error_msg").show();
             	$("#btn_ok").attr("disabled",false);
             }
         });
	});
	
	$("#index").click(function(){
		window.open(host_index);
	});
	
	$("#userFullName").click(function(){
		window.open(host_index + "/#/me");
	});
	
	$("#logOut").click(function(){
		localStorage["OnyxLoginInfo"] = JSON.stringify(login_info);
		$("#login_div").show();
   		$("#welcome").hide();
   		removeStoreCookieToken();
	});
	
	$("#btn_push").click(function(){
		// getCurrentUrl(push);

		downUseNotEpub();
		
	});
	
	restore_status();
});


function downUseNotEpub(){
	chrome.tabs.executeScript(
		null, 
		{file: "dotepub_content_script.js"}
	);
}

//监听 dotepub传来的 过滤内容 和 epub配置
chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
	if (request.type == "onyx-getcontent")	{
		var title = request.title;
		var content = request.content;
		sendToServer(title, content);
	}else if(request.type == "epub-storage"){
		var la=localStorage["lang"], link=0, fmt=localStorage["format"];
		if (typeof la=="undefined") {
			la=chrome.i18n.getMessage("lang");
		}
		var li=localStorage["link"];
		if (typeof li!="undefined" && li=="0") {
			link=1;
		}
		if (typeof fmt=="undefined") {
			fmt="epub";
		}
		sendResponse(
			{"lang": la, "link": link, "format": fmt}
		);
	}else{
		sendResponse({});
	}
}); 

function sendToServer(title, content){
	var data = {
		"installationId":login_info.device_ids,
		"title":title,
		"content":content
	};
	$.ajax({
         type: "POST",
         url: "http://localhost:9000" + "/api/1/push/browerExtensionPush",
         contentType:'application/json; charset=UTF-8',
		 data: JSON.stringify(data),
         dataType: "json",
         success: function(data){
             
         },
         error:function(data){
			
         }
     });
}

function initData(data){
	login_info.username = data.main.fullName;
	login_info.device_ids = data.deviceIds;
	login_info.email = data.main.email;
	login_info.token = data.sessionToken;
	localStorage["OnyxLoginInfo"] = JSON.stringify(login_info);
}

function welcome(token, n){
	if(n){//1表示之前没有数据
		requestCurrentUserInfo(token);
		return;
	}
	var localOptions = JSON.parse(localStorage["OnyxLoginInfo"]);
	login_info.username = localOptions["username"];
    login_info.device_ids = localOptions["device_ids"];
    login_info.email = localOptions["email"];
    login_info.token = localOptions["token"];
    
	$("#userFullName").text(login_info.username);
	$("#login_div").hide();
	$("#msg").hide();
    $("#welcome").show();
}

function requestCurrentUserInfo(token){
	
	$.ajax({
         type: "GET",
         url: host_index+"/api/1/account/me",
         headers: {
            "X-ONYX-SESSION-TOKEN":token,
        },
         contentType:'application/json; charset=UTF-8',
         dataType: "json",
         success: function(data){
             initData(data);
             welcome(token, 0);
         },
         error:function(data){

         }
     });
}

function toLogin(){
	$("#login_div").show();
	$("#welcome").hide();
	$("#msg").hide();
}

function restore_status()
{
	$("#msg").show();
	getStoreCookieToken(checkCookie, 0);
}

function checkCookie(cookie, n){
	if(cookie == null || typeof(cookie.value) == "undefined"){
		if(n){
			toLogin();
			return;
		} 
		//空的，弹出store网页,验证登录状态
		// var logo = window.open(host_index + "/images/OnyxLogo.png");
		// logo.close();
		chrome.windows.create({url:host_index + "/images/OnyxLogo.png?type=getcookie", width:1, height:1},function(w) {
			chrome.extension.onRequest.addListener(
			  function(request, sender, sendResponse) {
			    if (request.type == "onyx-getStorageOk"){
			    	console.log("关闭网页id"+w.id);
			    	chrome.windows.get(w.id, function(win){
			    		chrome.windows.remove(win.id);
			    	});
			    	//再次检查 cookie
					getStoreCookieToken(checkCookie, 1);
			    }
			  });
		});
		
	}else{//有 cookie
		welcome(cookie.value, n);
	}
}

function synchronizedToStore(){
	chrome.extension.sendRequest({type: "ep-bg-saveLocalStorage", token: login_info.token, fullName: login_info.username, email: login_info.email}, function(response) {});
}

/*
function push(title, url){
	$("#btn_push").val(title);
	var ids = login_info.device_ids;
	for (id in ids){
		pushEveryOne(id, title, url);
	}
}

function pushEveryOne(id, title, url){
	var args = {
		"title":title,
		"url":url
	};
	var data = {
		"installationId":id,
		"action":"",
		"args":args
	};
	$.ajax({
         type: "POST",
         url: "https://store.onyx-international.com/api/1/push/learnCloud",
         contentType:'application/json; charset=UTF-8',
		 data: JSON.stringify(data),
         dataType: "json",
         success: function(data){
             
         },
         error:function(data){
			
         }
     });
}
*/
/*
function getCurrentUrl(push){
    chrome.tabs.getSelected(function(tab){
        var title = tab.title; 
        var url = tab.url; 
        push(title,url);
    });
}
*/
