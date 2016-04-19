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
		console.log("background完成了host检测！");
	}else if(request.type == "onyx-sendpush"){
		sendResponse({});
		current_capture = request.data;
		changeIconPlay();
		isAllCapture = request.isAllCapture;
		if(isAllCapture){//extension capture
			// setTimeout(function(){
				// console.log("开始动态图标"+iconPlayId);
				// extensionRequestCapture(current_capture.url, current_capture.installationId);
			// },100);
			console.log("background已经异步进行全本抓取！");
		}else{//server capture
			pushRequest(request.url, request.data);
		}
		
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
		console.log("1、interval的id为"+iconPlayId);
	});
}

function changeIconStop(){
	clearInterval(iconPlayId);
	chrome.browserAction.setIcon({path : "icon.png"});
	console.log('停止动态图标'+iconPlayId);
}


function getBdydHrefList(url, list){
	var book_title = '';
	
	$.ajax({
		type : "get",
		url : url,
		async : false,
		success : function(result){
			var dom = $.parseHTML(result);
		    var div = $(dom).filter(".catList");
		    var alist = $(div).find("a");
		     
			book_title = $(dom).filter(".catHead").find("h1").text();
		    
		    $(alist).each(function() { 
		    	var title = $(this).text();
		    	var href = "http://yd.baidu.com"+$(this).attr("href");
		    	list.push([title,href]);
		    });
		    
		    var pn = $(dom).find(".p_n a");
		    $(pn).each(function() {
		    	if($(this).text()=="下页"){
		    		var href = $(this).attr("href");
		    		getBdydHrefList(getUrlBaseUrl(url,href), list, book_title);
		    	}
		    });
		}
	});
	return book_title;
}

function zipBdydHtml(list, book_title, idsArr){
	var zip = new JSZip();
	zip.file("ids", JSON.stringify(idsArr));
    zip.file("title", book_title);
    zip.file("total", ""+list.length);
	$.each(list,function(n,value) {
		var rclist = [];
		getNextPage(rclist, value[1]);
		zip.file(n+".title", value[0]);
		zip.file(n+".html", combineHtml(rclist));
	});
	zip.generateAsync({type:"blob"})
	.then(function(content) {
	    // saveAs(content, "example4.zip");
	    pushWithZip(content);
	});
}

function combineHtml(rclist){
	var html='';
	$.each(rclist,function(n,value){
		html += value;
	});
	return "<div class='r_c'>"+html+"</div>";
}

function getNextPage(list, baseHref){
	$.ajax({
		type : "get",
		url : baseHref,
		async : false,
		success : function(result){
			var content = $(result).find(".r_c").html();
			list.push(content);
			var nextPage = $(result).find(".p_n a");
			$(nextPage).each(function() {
		    	if($(this).text()=="下页"){
		    		var href = $(this).attr("href");
		    		getNextPage(list, getUrlBaseUrl(baseHref, href));
		    	}
		    });
		}
	});
}

function pushWithZip(blob){
	var fd = new FormData();
	fd.append("file", blob, "image.png");
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'http://192.168.0.64:9000/api/1/push/learnCloudWithZip', false);//同步
	xhr.send(fd);
}

function getUrlBaseUrl(url, href){
	var p = url.indexOf("?");
	return url.substring(0,p) + href;
}

function extensionRequestCapture(catUrl, idsArr){
	var list = [];
	var book_title = getBdydHrefList(catUrl, list);
	//console.log(list);
	// idsArr = ['123'];
	zipBdydHtml(list,book_title, idsArr);
	sendPushStatus(true);
}

