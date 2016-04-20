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
			extensionRequestCapture(current_capture.url, current_capture.installationId, request.url);
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


function getBdydHrefList(url){
	var book_title = '';
	
	$.ajax({
		type : "get",
		url : url,
		success : function(result){
			var dom = $.parseHTML(result);
		    var div = $(dom).filter(".catList");
		    var alist = $(div).find("a");
		     
			book_title = $(dom).filter(".catHead").find("h1").text();
		    
		    $(alist).each(function() { 
		    	var title = $(this).text();
		    	var href = "http://yd.baidu.com"+$(this).attr("href");
		    	urlList.push([title,href]);
		    });
		    
		    var pn = $(dom).find(".p_n a:contains(下页)");
		    
	    	if(pn.length>0){
	    		var href = $(pn).attr("href");
	    		getBdydHrefList(getUrlBaseUrl(url,href));
	    	}else{//last done
	    		downHrefList(book_title);
	    	}
		}
		
	});
	return book_title;
}

function zipBdydHtml(){
	var zip = new JSZip();
	zip.file("ids", JSON.stringify(idsArr));
    zip.file("title", book_title);
    zip.file("total", ""+contentList.length);
	$.each(contentList,function(n,value) {
		zip.file(n+".title", urlList[n][0]);
		zip.file(n+".html", addDivClass(value));
	});
	zip.generateAsync({type:"blob"})
	.then(function(content) {
	    // saveAs(content, "example4.zip");
	    pushWithZip(content, postUrl);
	});
}

function pushWithZip(blob, postUrl){
	var fd = new FormData();
	fd.append("file", blob, "image.png");
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange=function(){
	    if (xhr.readyState==4 && xhr.status==200){
	    	sendPushStatus(true);
	    }
	};
	xhr.open('POST', postUrl, true);//异步
	xhr.send(fd);
}

function addDivClass(html){
	return "<div class='r_c'>"+html+"</div>";
}

function getNextPage(contentList, baseHref, cur_index){
	$.ajax({
		type : "get",
		url : baseHref,
		success : function(result){
			var content = $(result).find(".r_c").html();
			if(typeof(contentList[cur_index])=='undefined'){
				contentList[cur_index] = content;
			}else{
				contentList[cur_index] += content;				
			}
			var nextPage = $(result).find(".p_n a:contains(下页)");
	    	if(nextPage.length>0){
	    		var href = $(nextPage).attr("href");
	    		getNextPage(contentList, getUrlBaseUrl(baseHref, href), cur_index);
	    	}else{// finished
	    		nextChapter();
	    	}
		}
	});
}


function getUrlBaseUrl(url, href){
	var p = url.indexOf("?");
	return url.substring(0,p) + href;
}

function extensionRequestCapture(catUrl, ids, postUrl){
	this.idsArr = ids;
	this.postUrl = postUrl;
	contentList = [];
	urlList = [];
	cur_chapter_index = 0;
	getBdydHrefList(catUrl);
}

var idsArr = [];
var postUrl = '';
var contentList = [];
var book_title = '';
var urlList = [];
var cur_chapter_index = 0;
function downHrefList(book_title){
	this.book_title = book_title;
	console.log("章节列表长度："+urlList.length);
	nextChapter();
}
function nextChapter(){
	if(cur_chapter_index == urlList.length){//finished
		zipBdydHtml();
		return;
	}
	getNextPage(contentList, urlList[cur_chapter_index][1], cur_chapter_index);
	cur_chapter_index++;	
}
