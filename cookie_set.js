
//设置cookie
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}


chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    if(request.type == "setCookie"){
    	var token = request.token;
    	var fullName = request.fullName;
    	var email = request.email;
    	localStorage["ngStorage-g"] = JSON.stringify({"token":token,"fullName":fullName,"email":email});
    	setCookie("token", token, 30);
		sendResponse({status:"ok"});
    }
  });