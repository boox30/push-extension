function removeCookie(){
	clearCookie("token");
	localStorage.removeItem("ngStorage-g");
}

removeCookie();

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