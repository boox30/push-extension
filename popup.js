var host_index = "https://store.onyx-international.cn";

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
             url: host_index + "/api/1/account/signin",
             contentType:'application/json; charset=UTF-8',
    		 data: JSON.stringify(data),
             dataType: "json",
             success: function(data){
                 $("#error_msg").hide();
                 $("#btn_ok").attr("disabled",false);
                 initData(data);
                 welcome();
                 setLogin({token:data.sessionToken, fullName:data.main.fullName, email:data.main.email});
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
		$("#login_div").show();
   		$("#welcome").hide();
   		removeLogin();
	});
	
	$("#btn_push").click(function(){
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
		var url = request.url;
		sendToServer(title, content, url);
	}else if(request.type == "epub-storage"){
		var la=localStorage["lang"], link=0, fmt=localStorage["format"];
		if (typeof la=="undefined") {
			// la=chrome.i18n.getMessage("lang");
			la = "en";
		}
		var li=localStorage["link"];
		if (typeof li!="undefined" && li=="0") {
			link=1;
		}
		if (typeof fmt=="undefined") {
			fmt="epub";
		}
		sendResponse(
			{"lang": la, "link": 1, "format": fmt}
		);
	}else{
		sendResponse({});
	}
}); 

function sendToServer(title, content, url){
	content = content + "<div id='originalSource'>原文地址：<a href='"+url+"' target='_self'>"+url+"</a></div>";
	var data = {
		"installationId":login_info.device_ids,
		"title":title,
		"content":content
	};
	$.ajax({
         type: "POST",
         url: "http://192.168.0.36:9000" + "/api/1/push/browerExtensionPush",
         contentType:'application/json; charset=UTF-8',
		 data: JSON.stringify(data),
         dataType: "json",
         success: function(data){
             $("#downUrl").text(data.url);
             $("#downUrl").attr("href", data.url);
         },
         error:function(data){
			
         }
     });
}

function initData(data, token){
	if(typeof(data) != "undefined"){
		login_info.username = data.main.fullName;
		login_info.device_ids = data.deviceIds;
		login_info.email = data.main.email;
		if(typeof(token) != "undefined"){
			login_info.token = token;
		}else{
			login_info.token = data.sessionToken;		
		}
	}
	localStorage["OnyxLoginInfo"] = JSON.stringify(login_info);
}

function getLocalStorage(){
	if(typeof(localStorage["OnyxLoginInfo"] == "undefined")){
		initData();
	}
	return localStorage["OnyxLoginInfo"];
}

function welcome(token){
	var localOptions = JSON.parse(getLocalStorage());
	var lastLocalToken = localOptions["token"];
	if(typeof(token) != "undefined" &&token != lastLocalToken){//用户变了
		requestCurrentUserInfo(token);
		return;
	}
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
             initData(data, token);
             welcome(token);
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
	getAutoLogin();
}

function getAutoLogin(){
	chrome.tabs.create({url:host_index, selected : false}, function(tab){
		chrome.tabs.executeScript(tab.id, {file : "cookie_get.js"}, function(){
			chrome.tabs.remove(tab.id);
			chrome.cookies.get({url:host_index, name:"token"}, function(cookie){
				if(cookie == null || typeof(cookie.value) == "undefined"){
					toLogin();
				}else{
					welcome(cookie.value);
				}
			});
		});
	});	
}

function removeLogin(){
	chrome.tabs.create({url:host_index, selected : false}, function(tab){
		chrome.tabs.executeScript(tab.id, {file : "cookie_remove.js"}, function(){
			chrome.tabs.remove(tab.id);
		});
	});	
}

function setLogin(data){
	chrome.tabs.create({url:host_index, selected : false}, function(tab){
		chrome.tabs.executeScript(tab.id, {file : "cookie_set.js"}, function(){
			chrome.tabs.sendRequest(tab.id, {type: "setCookie", token:data.token, fullName:data.fullName, email:data.email}, function(response) {
				if(response.status == "ok"){
					chrome.tabs.remove(tab.id);
				}
			  });
		});
	});	
}
