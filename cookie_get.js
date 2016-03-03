function getCookie(){
	if(typeof(localStorage["ngStorage-g"]) == "undefined"){
		clearCookie("token");
		return;
	}
	var localOptions = JSON.parse(localStorage["ngStorage-g"]);
	var onyxToken = localOptions["token"];
	if(typeof(onyxToken) == "undefined"){
		clearCookie("token");
		return;
	}
	setCookie("token", onyxToken, 30);
}

getCookie();

//设置cookie
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}
//清除cookie  
function clearCookie(name) {  
    setCookie(name, "", -1);  
} 