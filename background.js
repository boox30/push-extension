function getDomainFromUrl(url){
	var host = "null";
	if(typeof url == "undefined" || null == url)
		url = window.location.href;
	var regex = /.*\:\/\/([^\/]*).*/;
	var match = url.match(regex);
	if(typeof match != "undefined" && null != match)
		host = match[1];
	return host;
}

function changeUrl(url) {
	current_host = getDomainFromUrl(url).toLowerCase();
	if($.inArray( current_host, include_host_array ) > 0){
		return getCatUrl(current_host, url);
	}
	return "";
};

var include_host_array = ["example.cc","yuedu.baidu.com"];

var current_capture;

function getCatUrl(host, url){
	var catUrl;
	switch (host){
		case "yuedu.baidu.com"://http://yuedu.baidu.com/ebook/1bc9c8cf852458fb770b569b?pn=1&click_type=10010002&rf=http%3A%2F%2Fyuedu.baidu.com%2F#
		ind = url.indexOf("ebook/");
		if(ind==-1){
			break;
		}
		id = url.substr(ind+6,24);
		catUrl = "http://yd.baidu.com/ebook/"+id+"?type=cat&pn=1";
		break;
		default :
		catUrl = "";
	}
	return catUrl;
}

function pushRequest(url, data){
	console.log("发送push");
	$.ajax({
         type: "POST",
         url: url,
         contentType:'application/json; charset=UTF-8',
		 data: JSON.stringify(data),
         dataType: "json",
         success: function(data){
            console.log("完成push，下载路径"+data.url);
		    sendPushStatus(true);
         },
         error:function(data){
         	console.log("push发送出错");
         	sendPushStatus(false);
         }
     });
}

function sendPushStatus(status){
	current_capture = null;
	chrome.extension.sendRequest({type: "onyx-sendpush-suc",  status: status}, function(response) {
	});
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
	if (request.type == "onyx-checkincludehost_pushstatus"){
		var url = request.cur_url;
		var caturl = changeUrl(url);
		sendResponse(
			{"caturl": caturl, "current_capture": current_capture}
		);
	}else if(request.type == "onyx-sendpush"){
		sendResponse({});
		current_capture = request.data;
		pushRequest(request.url, request.data);
	}
}); 

