var host_index = "https://store.onyx-international.com";

function setStoreCookieToken(token){
	chrome.cookies.set({url:host_index, name:"token", value:token});
}

function getStoreCookieToken(callback){
	return chrome.cookies.get({url:host_index, name:"token"}, function(cookie){
		callback(cookie);
	});
}

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

function checkForValidUrl(tab) {
	if(tab.url== (host_index+"/images/OnyxLogo.png?type=getcookie")){
		chrome.tabs.getSelected(null, function(tab) {
		  chrome.tabs.sendRequest(tab.id, {type: "onyx-getStoreStorage"}, function(response) {
		  	console.log("tab变化了,发送了请求");
		  	if(typeof(response) != "undefined"){
		  		console.log("设置了cookie");
			    setStoreCookieToken(response.token);
		  	}
		  	notify_extension_getStorageOk();
		  });
		});
	}
};

chrome.tabs.onCreated.addListener(checkForValidUrl);

function notify_extension_getStorageOk(){
	  chrome.extension.sendRequest({type: "onyx-getStorageOk"}, function(response) {});
}

chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    if (request.type == "ep-bg-saveLocalStorage"){
    	var token = request.token;
    	var fullName = request.fullName;
    	var email = request.email;
    	chrome.windows.create({url:host_index + "/images/OnyxLogo.png?type=setcookie", width:1, height:1},function(w) {
    		setTimeout(function(){
    			chrome.tabs.getSelected(null, function(tab) {
				  chrome.tabs.sendRequest(tab.id, {type: "bg-cs-setStoreStorage", token:token, fullName:fullName, email:email}, function(response) {
				  	console.log(response);
				  	if(typeof(response) != "undefined" && response.status == "ok"){
				  		setStoreCookieToken(token);
				  		chrome.windows.remove(w.id);
						sendResponse({});
				  	}
				  });
				});
    		},1000);
		});
    }
  });
