
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    if (request.type == "onyx-getStoreStorage"){
    	if(typeof(localStorage["ngStorage-g"]) == "undefined"){
    		sendResponse({});
    	}
    	var localOptions = JSON.parse(localStorage["ngStorage-g"]);
		var onyxToken = localOptions["token"];
		if(typeof(onyxToken) == "undefined"){
			sendResponse({});
			console.log("没有token");
		}else{
			sendResponse({token: onyxToken});
			console.log("发送了token"+onyxToken);
		}
    }else if(request.type == "bg-cs-setStoreStorage"){
		 var token = request.token;
    	 var fullName = request.fullName;
    	 var email = request.email;
    	 localStorage["ngStorage-g"] = JSON.stringify({"token":token,"fullName":fullName,"email":email});
    	 sendResponse({status:"ok"});
    }else{
    	sendResponse({});
    }
  });




