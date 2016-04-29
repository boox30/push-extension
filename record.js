var local_storage = {
	"push_record" : []  //下载记录 
};
$(document).ready(function(){
	initData();
});

function initData(){
	if(typeof(localStorage["onyxPushRecord"]) != "undefined"){
		local_record = JSON.parse(localStorage["onyxPushRecord"]);
		var optionValue = local_record["push_record"];
		for(i=0; i<optionValue.length; i++){
			addTr(optionValue[i]);
		}
	}
	$(".del_btn").click(function(){
		var href = $(this).parent().prev().find("a").attr("href");
		record_delete(href);
		$(this).closest("tr").hide("normal");
	});
}

function addTr(value){
	var html = "<tr><td class='tabs1'>"
		+ value[0]
		+ "<br><a href='"
		+ value[1]
		+ "'>"
		+ value[1]
		+ "</a></b></td><td><a class='del_btn' href='#'>从列表中移除</a></td></tr>";
	$("#tbody").append($(html));
};

function record_delete(href){
	local_record = JSON.parse(localStorage["onyxPushRecord"]);
	var optionValue = local_record["push_record"];
	var remove_id=-1;
	for(i=0; i<optionValue.length; i++){
		if(optionValue[i][1]==href){
			remove_id = i;
			break ;
		}
	}
	if(remove_id>-1){
		optionValue.splice(remove_id, 1);
		localStorage["onyxPushRecord"] = JSON.stringify(local_record);
	}
}
