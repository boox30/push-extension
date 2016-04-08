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

function pushRequest(url, r_data){
	console.log("发送push");
	$.ajax({
         type: "POST",
         url: url,
		 data: JSON.stringify(r_data),
		 contentType:'application/json; charset=UTF-8',
         dataType: "text",
         success: function(data){
         	data_json = JSON.parse(data);
            console.log("完成push，下载路径"+data_json.url);
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
	changeIconStop();
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
		changeIconPlay();
		pushRequest(request.url, request.data);
	}
}); 

var iconPlayId;
function changeIconPlay(){
	var canvas = document.createElement("canvas");
	canvas.height=32;
	canvas.width=32;
	var ctx=canvas.getContext("2d");
	var img=document.createElement("img");
	img.src = "icon.png";
	
	$(img).load(function(){
	    // 加载完成    
	    ctx.drawImage(img,0,0);
		var imgData=ctx.getImageData(0,0,canvas.height,canvas.width);
		var i=1;
		iconPlayId = setInterval(function(){
			ctx.putImageData(imgData,0,0);
			i+=2;
			var x = i%50;
			ctx.strokeStyle="#85BA25"; 
			ctx.lineWidth=3; 
			ctx.lineCap="round"; 
			ctx.beginPath(); 
			ctx.moveTo(x, 16);
			ctx.lineTo(x-22, 16);
			ctx.stroke(); 
			ctx.closePath(); 
			ctx.lineTo(x-11, 5);
			ctx.stroke(); 
			ctx.closePath(); 
			ctx.lineTo(x-11, 27);
			ctx.stroke(); 
			ctx.closePath(); 
			
			var imgDataDot = ctx.getImageData(0,0,canvas.height,canvas.width);
			chrome.browserAction.setIcon({imageData : imgDataDot});
		},100);
	});
}

function changeIconStop(){
	clearInterval(iconPlayId);
	chrome.browserAction.setIcon({path : "icon.png"});
}

