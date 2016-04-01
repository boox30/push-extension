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

chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
	if (request.type == "onyx-checkincludehost"){
		var url = request.cur_url;
		var caturl = changeUrl(url);
		sendResponse(
			{"caturl": caturl}
		);
	}
}); 

