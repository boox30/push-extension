// var host_index = "https://store.onyx-international.cn";
var host_index = "http://192.168.0.64:9000";
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
             	if(checkEmpty(data.code)){
             		$("#prompt_msg").text("服务器未连接!");
             	}else{
             		$("#prompt_msg").text("密码错误请重新输入!");
             	}
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
		if(!checkEmpty(caturl)){//不为空, 发送至background去请求
			sendToServer('', '', '', true);
		}else{
			downUseNotEpub();
		}
	});
	
	$("#push_local>a").click(function(){
		$("#uploadfile").trigger('click'); 
	});
	
	
	$("body").on('change', "#uploadfile" ,function(){ 
		console.log("上传");
		uploadFile();
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
		sendToServer(title, content, url, false);
		sendResponse({});
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
	}else if(request.type == "onyx-sendpush-suc"){
		if(request.status){
			$("#prompt_msg").text("发送成功！");
		}else{
			$("#prompt_msg").text("服务器错误！");
		}
		$("#btn_push").attr("disabled",false);
		sendResponse({});
	}else{
		sendResponse({});
	}
}); 

function sendToServer(title, content, url, isAllCapture){
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
	disablePushBtn();
	var postUrl = isAllCapture?(host_index + "/api/1/push/saveAndPush"):(host_index + "/api/1/push/leanCloud");
	chrome.extension.sendRequest({type: "onyx-sendpush",  url: postUrl, data: data, isAllCapture:isAllCapture}, function(response) {
	  
	});
}

function disablePushBtn(){
	$("#btn_push").attr("disabled",true);
	$("#prompt_msg").text("正在生成电子书，请稍候...");
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
	if(typeof(str) == "undefined" || str == null || str == ''){
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
	console.log("检查host和网址是否支持整本抓取");
	getAutoLogin();
	console.log("完成数据初始化");
}

function checkHost(){
	chrome.tabs.getSelected(function(tabs){
		chrome.extension.sendRequest({type: "onyx-checkincludehost_pushstatus", cur_url : tabs.url}, function(response) {
		  var caturl = response.caturl;
		  if(!checkEmpty(caturl)){//不为空
		  	$("#push-line > em").text("（支持整本书发送）");
		  	this.caturl = caturl;
		  }
		  //检查pushstatus
		  var current_cap = response.current_capture;
		  if(!checkEmpty(current_cap)){
		  	disablePushBtn();
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

function uploadFile(){
	var idsArr = getSelectinstallationIds();
	var file = $("#uploadfile").val();
	var fileName = getFileName(file);
	$("#prompt_msg").text("正在发送中");
	$.ajaxFileUpload({  
        url:host_index + "/api/1/push/localPush?installationId="+JSON.stringify(idsArr)+"&fileName="+fileName,            //需要链接到服务器地址  
        secureuri:false,  
        dataType: "text",
        fileElementId:'uploadfile',                        //文件选择框的id属性
        success: function(data, status){     
            console.log(data);
            $("#prompt_msg").text("发送成功！");
        },error: function (data, status, e){ 
            $("#prompt_msg").text("发送失败！");
        }  
    });  
}
function getFileName(o){
    var pos=o.lastIndexOf("\\");
    return o.substring(pos+1);  
}

