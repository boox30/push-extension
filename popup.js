var host_index = "https://store.onyx-international.cn";
// var host_index = "http://192.168.0.36:9000";
var cookie_name = "ngStorage-g";

var login_info =
{
    fullName: "",
    deviceList: [],
    email:"",
    token:""
};

var local_options = {
	"select_device_ids" : []  //设备 idString 
};

var caturl = "";

$(document).ready(function(){

	$("#btn_ok").click(function(){
		var email = $("#email").val();
		var password = $("#password").val();
		var data = {
			email:email,
			password:password
		};
		$("#btn_ok").attr("disabled",true);
		$("#prompt_msg").text(" ");
		$.ajax({
             type: "POST",
             url: host_index + "/api/1/account/signin",
             contentType:'application/json; charset=UTF-8',
    		 data: JSON.stringify(data),
             dataType: "json",
             success: function(data){
                 $("#btn_ok").attr("disabled",false);
                 var cookie_user = {token:data.sessionToken, fullName:data.main.fullName, email:data.main.email};
                 setLoginCookie(cookie_user);
                 welcome(cookie_user, 1);
             },
             error:function(data){
             	$("#prompt_msg").text("密码错误请重新输入!");
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
   		logOut();
	});
	
	restore_status();
	
	$("#btn_push").click(function(){
		console.log('dd '+caturl);
		if(!checkEmpty(caturl)){//不为空
			sendToServer('', '', '');
		}else{
			downUseNotEpub();
		}
	});
	
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
	if(login_info.deviceList.length == 0){
		$("#prompt_msg").text("你的账号还未绑定任何设备！");
		return;
	}
	var idsArr = getSelectinstallationIds();
	if(idsArr.length == 0){
		$("#prompt_msg").text("请选择至少一个设备进行推送！");
		return;
	}else{
		$("#prompt_msg").text(" ");
	}
	content = content + "<div class='originalSource'>原文地址：<a href='"+url+"' target='_self'>"+url+"</a></div>";
	var data = {
		"installationId":idsArr,
		"title":title,
		"content":content,
		"url":caturl
	};
	
	$("#btn_push").attr("disabled",true);
	$("#prompt_msg").text("正在生成电子书，请稍候...");
	$.ajax({
         type: "POST",
         url: host_index + "/api/1/push/learnCloud",
         contentType:'application/json; charset=UTF-8',
		 data: JSON.stringify(data),
         dataType: "json",
         success: function(data){
             $("#downUrl").text(data.url);
             $("#downUrl").attr("href", data.url);
             $("#prompt_msg").text("发送成功！");
             $("#btn_push").attr("disabled",false);
         },
         error:function(data){
         	$("#prompt_msg").text("服务器错误！");
         	$("#btn_push").attr("disabled",false);
         }
     });
}

function getSelectinstallationIds(){
	var arr = [];
	for(i=0; i<login_info.deviceList.length; i++){
		var device = login_info.deviceList[i];
		if(device.selected){
			var id = device.installationMap.leanCloud;
			if(typeof(id) != "undefined"){
				arr.push(id);
			}else{
				//console.log('设备' + i + '未绑定leanCloud');
			}
		}
	}
	return arr;
}

function welcome(cookie_user, isUserLogin){
	login_info.fullName = cookie_user.fullName;
    login_info.email = cookie_user.email;
    login_info.token = cookie_user.token;
    
	//get Device Name and installationId
	getDeviceListInfo();
	
	if(typeof(isUserLogin) != "undefined"){
    	storageSelectAll();
    }
	
	//init device selected
	initSelected();
    
	$("#userFullName").text(login_info.fullName);
	$("#login_div").hide();
	$("#msg").hide();
    $("#welcome").show();
}

function storageSelectAll(){
	var selectIds = local_options.select_device_ids;
	var ds = login_info.deviceList;
	for(var i=0; i<ds.length; i++){
		var noLeanCloud = checkEmpty(ds[i].installationMap.leanCloud);
		if(!noLeanCloud){
			selectIds.push(ds[i].idString);		
		}
	}
	localStorage["onyxPushOptions"] = JSON.stringify(local_options);
}

function initSelected(){
	
	if(typeof(localStorage["onyxPushOptions"]) != "undefined"){
		local_options = JSON.parse(localStorage["onyxPushOptions"]);
		var optionValue = local_options["select_device_ids"];
		for(i=0; i<login_info.deviceList.length; i++){
			if($.inArray(login_info.deviceList[i].idString, optionValue) != -1){
				login_info.deviceList[i].selected = true;
			}else{
				login_info.deviceList[i].selected = false;
			}
		}
	}
	if(login_info.deviceList.length == 0){
		$("#prompt_msg").text("你的账号还未绑定任何设备！");
		return;
	}else{
		$("#prompt_msg").text(" ");
	}
	var parentLi = $("<li id='device_par'></li>");
	var title = $("<strong>选择需要接收消息的设备：</strong>");
	var div = $("<div id='device_list'></div>");
	var ul = $("<ul id='device_ul'></ul>");
	for(i=0; i<login_info.deviceList.length; i++){
		var device = login_info.deviceList[i];
		var noLeanCloud = checkEmpty(device.installationMap.leanCloud);
		var li = $("<li><input type='checkbox' idstr='" + device.idString + "' " + (device.selected?"checked ":" ") + (noLeanCloud?"disabled='disabled' ":" ") + "/>"
		 + device.model + "-" + (checkEmpty(device.name)?i:device.name) + (noLeanCloud?"<font color='red'>（设备未注册推送服务）</font>":"")
		 + "</li>");
		$(ul).append(li);
	}
	$(div).append(ul);	
	$(parentLi).append(title);
	$(parentLi).append(div);
	$("#push-line").before(parentLi);
	$("#device_ul input").bind("change",function(){
		var idString = $(this).attr("idstr");
		var selectIds = local_options.select_device_ids;
		
		if($(this).is(':checked')){
			var index = jQuery.inArray(idString, selectIds);
			if(index<0){
				selectIds.push(idString);
			}
			login_info.deviceList[$(this).index()].selected = true;
		}else{
			selectIds.splice(jQuery.inArray(idString, selectIds),1); 
			login_info.deviceList[$(this).index()].selected = false;
		}
		localStorage["onyxPushOptions"] = JSON.stringify(local_options);
	});
}

function checkEmpty(str){
	if(typeof(str) == "undefined" || str == ''){
		return true;
	}else{
		return false;
	}
}

function getDeviceListInfo(id){
	$.ajax({
         type: "GET",
         url: host_index+"/api/1/account/devices",
         headers: {
            "X-ONYX-SESSION-TOKEN":login_info.token,
         },
         async:false,
         dataType: "json",
         success: function(data){
             login_info.deviceList = data;
         },
         error:function(data){

         }
     });
}

function restore_status()
{
	$("#msg").show();
	//checkHost
	checkHost();
	getAutoLogin();
}

function checkHost(){
	chrome.tabs.getSelected(function(tabs){
		chrome.extension.sendRequest({type: "onyx-checkincludehost", cur_url : tabs.url}, function(response) {
		  var caturl = response.caturl;
		  if(!checkEmpty(caturl)){//不为空
		  	$("#push-line > em").text("（支持整本书发送）");
		  	this.caturl = caturl;
		  }
		});
	});
}

function getAutoLogin(){
	chrome.cookies.get({url:host_index, name:cookie_name}, function(cookie){
		if(cookie == null || typeof(cookie.value) == "undefined"){
			toLogin();
		}else{
			welcome(JSON.parse(cookie.value));
		}
	});
}

function toLogin(){
	$("#login_div").show();
	$("#welcome").hide();
	$("#msg").hide();
}

function logOut(){
	removeLoginCookie();
	$("#device_par").remove();
	local_options.select_device_ids = [];
}

function removeLoginCookie(){
	chrome.cookies.remove({url:host_index, name:cookie_name});
}

function setLoginCookie(data){
	var cookieVal = JSON.stringify({"token":data.token,"fullName":data.fullName,"email":data.email});
	var timestamp = new Date().getTime()/1000 + 3600*24*30;
	chrome.cookies.set({url:host_index, name:cookie_name, value: cookieVal, expirationDate:timestamp});
}


