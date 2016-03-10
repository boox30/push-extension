chrome.extension.sendRequest(
	{type: "epub-storage"},
	function(response){
		var 
			dotEPUB_links=response.link,
			dotEPUB_lang=response.lang,
			dotEPUB_format=response.format,
			dotEPUB_type='Chrome+Extension',

			work="Conversion in progress - work",
			load="The page has no content or it is not fully loaded. Please, wait till the page is loaded."
		;
		switch(dotEPUB_lang){
			case "ca":
				work="Conversió en curs";
				load="La pàgina no té contingut o no ha acabat de carregar-se. Sisplau, espera que la pàgina hagi acabat de carregar-se.";
			break;
			case "es":
				work="Conversión en curso";
				load="La página no tiene contenido o no se ha acabado de cargar. Por favor, espera a que la página se haya cargado.";
			break;
		}

		try{
			var d=document, w=window;
			if(!d.body||d.body.innerHTML=='')throw(0);
			var 
				dotEPUB_bookver='1.2',

				s=d.createElement('link'),
				h=d.getElementsByTagName('head')[0],
				i=d.createElement('div'),
				j=d.createElement('script')
			;
			s.rel='stylesheet';
	//		s.href='//dotepub.com/s/dotEPUB-favlet.css';
			s.type='text/css';
			s.media='screen';
			h.appendChild(s);
			i.setAttribute('id','dotepub');
			i.innerHTML='<div id="status"></div>';
			d.body.appendChild(i);

/* CONVERSION ENGINE */
var dotEPUB = {
	version: '0.8.15',
	path: "//dotepub.com/api/v1/post", 
	doc: null,
	flags: "|",
	imgs: 0,
	format: "epub",
	links: 0,
	lang: "en",
	type: "Bookmarklet", /* 0.7.1 Just a default value now: it's modified externaly if defined externally in dotEPUB_type (extensions only) */
	debug: false,

	/** AUX FUNCTIONS **/

	/* Simplified from getElementsByClassName by Jonathan Snook + Robert Nyman */
	gelByClass: function(oElm, strClassName) {
		var arrElements = oElm.getElementsByTagName("*");
		var arrReturnElements = new Array();
		strClassName = strClassName.replace(/\-/g, "\\-");
		var oRegExp = new RegExp("(^|\\s)" + strClassName + "(\\s|$)");
		var oElement;
		for(var i=0; i<arrElements.length; i++){
			oElement = arrElements[i];
			if(oRegExp.test(oElement.className)){
				arrReturnElements.push(oElement);
			}   
		}
		return (arrReturnElements);
	},

	meta: function(m) {
		var meta=document.getElementsByTagName("meta");
		for(var i=0; i<meta.length; i++){
			if(meta[i].getAttribute("name") && meta[i].getAttribute("name").toLowerCase()==m){
				return meta[i].getAttribute("content");
			}
		}
		return "";
	},

	getLang: function(){
		var 
			d=document.documentElement,
			wlang=d.lang,
			txt=d.textContent
		;
		if(typeof wlang!=="undefined" && wlang!==""){
			if(wlang==="zh"){
				return "zh-CN";
			}
			return wlang;
		}
		if(txt.search(/的/)!==-1){ // || txt.search(/中/)!==-1
			return "zh-CN";
		}
		if(txt.search(/の/)!==-1){
			return "ja";
		}
		return "en";
	},

	getAuthor: function(){
		/* 0.8.5 Widget envia valor null */
		if (typeof dotEPUB_author!='undefined' && dotEPUB_author!='null'){
			return "<dotEPUB_sep/>"+dotEPUB_author;
		}

		if(document.getElementById("dotEPUBauthor")){
			return "<dotEPUB_sep/>"+rd.getInnerText(document.getElementById("dotEPUBauthor"));
		}

		/* meta movabletype cnn... drupal... */
		var metaauthor=dotEPUB.meta("author");

		/* HTML5 rel=author & schema itemprop 0.8.6 */
		/* Assuming first author is the main content author... */
		var e=document.getElementsByTagName("body")[0].getElementsByTagName("*");
		for (var i=0, len=e.length; i<len; i++){
			var 
				itemprop=e[i].getAttribute("itemprop"),
				rel=e[i].getAttribute("rel")
			;
			if( rel==="author" || itemprop==="author" || itemprop==="creator"){
				return metaauthor+"<dotEPUB_sep/>"+rd.getInnerText(e[i]);
			}
		}

		/* byline-author blogger */
		/* byline-name bbc*/
		/* byline blogger nyt bbc salon */
		/* headline_meta postmeta postmetadata entry-tagline wordpress */
		/* blog-byline theguardian blogs */
		/* firma elpais.com */
		/* article_byline pw */
		/* No: "author" too wide: will get comments' author*/
		var classes=["byline-author", "byline-name", "byline", "headline_meta", "postmeta", "postmetadata", "entry-tagline", "blog-byline", "firma", "article_byline","story_author"];

		/* post-author blogger */
		var author=dotEPUB.gelByClass(document, "post-author")[0];
		if (typeof author!="undefined"){
			var fn=dotEPUB.gelByClass(author, "fn")[0];
			if(typeof fn!="undefined"){
				return metaauthor+"<dotEPUB_sep/>"+rd.getInnerText(fn);
			}
			return metaauthor+"<dotEPUB_sep/>"+rd.getInnerText(author);
		}

		for(var c=0; c<classes.length; c++){
			author=dotEPUB.gelByClass(document, classes[c])[0];
			if (typeof author!="undefined"){
				var fn=dotEPUB.gelByClass(author, "author")[0];
				if(typeof fn!="undefined"){
					return metaauthor+"<dotEPUB_sep/>"+rd.getInnerText(fn);
				}
				return metaauthor+"<dotEPUB_sep/>"+rd.getInnerText(author);
			}
		}
		return metaauthor;
	},

	addFlag: function(flag) {
        dotEPUB.flags = dotEPUB.flags+flag+"|";
    },

	field: function(e,name,value){
		var hidden = document.createElement("input");
		hidden.setAttribute("type", "hidden");
		hidden.setAttribute("name", name);
		hidden.setAttribute("value", value);
		e.appendChild(hidden);
	},

	createRepl: function(e,text,uri){
		var em = document.createElement("em");
		em.className="dotEPUBProtected";
		var link = document.createElement("a");
		link.href=uri;
		var txt = document.createTextNode(text);
		link.appendChild(txt);
		var txt0=document.createTextNode(" [");
		var txt1=document.createTextNode("] ");
		em.appendChild(txt1);
		txt1.parentNode.insertBefore(link,txt1);
		link.parentNode.insertBefore(txt0,link);
		e.parentNode.insertBefore(em,e);
		e.parentNode.removeChild(e);
	},

/* Not used currently: ready for <figure>...? Or not necessary?
	ElemRepl: function(e,from,to){
		var open=new RegExp("<"+from+">","g");
		var close=new RegExp("<\/"+from+">","g");
		e.innerHTML = e.innerHTML.replace(open,'<'+to+'>').replace(close,'<\/'+to+'>');
	},
*/

	imgRepl: function (e,tl) {
		var txtnode=dotEPUB.messages["imgremoved"][dotEPUB_lang];
		dbg("dotEPUB: img replaced "+tl.length);
		for (var y=tl.length-1; y >= 0; y--) {
			dotEPUB.createRepl(tl[y],txtnode,tl[y].src);
		}
		return e;
	},

	/* Convert relative links into absolute links */
	Absolutize: function (e) {
		var a = e.getElementsByTagName('a');
		for(var i = a.length-1; i >= 0; i--){
			a[i].href=a[i].href;
		}
	},

	imgLinks: function (e) {
		var targetList = e.getElementsByTagName("img"), links="", html=e.innerHTML, nimg=targetList.length, maxi=10, exceeds=false;
		dbg("dotEPUB: img links "+nimg);
		if (nimg==0){
			return [e,""];
		}
		// modify by zc , not confirm , have image direct
		if(0){
			e=dotEPUB.imgRepl(e,targetList);
			return [e,""];
		}
		if(nimg>maxi){
			alert(dotEPUB.messages["manyimgs"][dotEPUB_lang]);
			nimg=maxi;
			exceeds=true; // 0.8.6 There are more imgs than dotepub can take
		}
		dotEPUB.imgs=1;

		var cont=0;
		for (var y=0; y<nimg; y++) {
			/* Yes, it happens: <img> without source in code. */
			if (targetList[y].src=="") {
				continue;
			}
			/* 0.8.4: skip src=data:image/jpeq... */
			if (targetList[y].src.match(/^data:/)) {
				html = html.replace(/<img /, '<imagedata ');
				continue;
			}
			cont++;
			var alt=targetList[y].alt;
			if (alt==""){
				alt=targetList[y].title;
				if (alt==""){
					alt="[IMG]";
				}
			}
			alt = alt.replace(/\t/g, ' ');
			html = html.replace(/<img /, '<imgdotepub=\"num'+cont+'\" class=\"dotEPUBProtected\"');
			links+=targetList[y].src+"\t"+alt+"\t";
		}

		// Process the images that can't be processed and remove them gracefully
		if (exceeds){
			e.innerHTML=html;
			var ntargetList=e.getElementsByTagName("img"), nimg=targetList.length, e=dotEPUB.imgRepl(e,ntargetList), html=e.innerHTML;
		}

		html = html.replace(/<imgdotepub/g, '<img dotepub'); /* must be an image, not unknown tag, otherwise could be removed later by readability */
		html = html.replace(/<imagedata /g, '<img '); //0.8.4
		e.innerHTML = html;
		return [e,""];// modify by zc : old pass "<dotEPUBimgs>"+links+"</dotEPUBimgs>"
	},

	/* object, embed, iframe (google blogspots has iframe with src=www.youtube.com), video tags; youtube and vimeo */
	videoRepl: function (e) {
		var txtnode=dotEPUB.messages["videoremoved"][dotEPUB_lang];
		var objectList = e.getElementsByTagName("object");
		dbg("dotEPUB: video replace object candidates "+objectList.length);
		for (var y=objectList.length-1; y >= 0; y--) {
			var paramList=objectList[y].getElementsByTagName("param");
			params:
			for (var p=0; p<paramList.length; p++){
				for (var i=0; i<paramList[p].attributes.length; i++) {
					if (paramList[p].attributes[i].value.search(rd.regexps.videoRe) !== -1) {
						var video=paramList[p].attributes[i].value;
						dotEPUB.createRepl(objectList[y],txtnode,video);
						dbg("dotEPUB: video replaced (object) "+video);
						break params;
					}
				}
			}
		}

		var tags=new Array("embed","iframe", "video");
		for (var elem in tags){
			var embedList = e.getElementsByTagName(tags[elem]);
			dbg("dotEPUB: video replace "+tags[elem]+" candidates "+embedList.length);
			for (var o=0; o<embedList.length; o++) {
				for (var il=0; il<embedList[o].attributes.length; il++) {
					if (embedList[o].attributes[il].value.search(rd.regexps.videoRe) !== -1) {
						var video=embedList[o].attributes[il].value;
						dotEPUB.createRepl(embedList[o],txtnode,video);
						dbg("dotEPUB: video replaced ("+tags[elem]+") "+video);
						break;
					}
				}
			}
		}
	},

	removeStatus: function(){
		if(typeof dotEPUBstatus!="undefined"){ dotEPUBstatus.parentNode.removeChild(dotEPUBstatus);}
	},

	send: function(article,author,copy){
			//0.8.0 Local file i es volien imatges?
			if(window.location.href.indexOf("file")==0 && dotEPUB.links){
				if(!confirm(dotEPUB.messages["local"][dotEPUB_lang])){
					dotEPUB.removeStatus();
					return;
				}
			}

			var alen=article.content.length;
			if(alen>500000 && alen<2999999){
				if(!confirm(dotEPUB.messages["toolong"][dotEPUB_lang])){
					dotEPUB.removeStatus();
					return;
				}
			}
			if(alen>3000000){
				alert(dotEPUB.messages["tootoolong"][dotEPUB_lang]);
				dotEPUB.removeStatus();
				return;
			}

			/* Analytics */
			if(!document.getElementById("dotepub_iframe")){
				var ifr = document.createElement("iframe");
				ifr.frameBorder=0;
				ifr.style.cssText="position:absolute;top:0px;right:0px;width:0pt;height:0pt;";
				ifr.id="dotepub_iframe";
				document.body.appendChild(ifr);

				if (ifr) {
					var iframeDoc;
					if (ifr.contentDocument) {
						iframeDoc = ifr.contentDocument;
					}
					else if (ifr.contentWindow) {
						iframeDoc = ifr.contentWindow.document;
					}
					else if (window.frames[ifr.name]) {
						iframeDoc = window.frames[ifr.name].document;
					}
					if (iframeDoc) {
						iframeDoc.open();
						var 
							bookversion=(dotEPUB_bookver==='')?'0':dotEPUB_bookver,
							loc=window.location,
							host=loc.hostname
						;
						iframeDoc.write(
							"<html><head><script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create', 'UA-3753530-8', 'auto');ga('send', 'event', 'Downloads ("+dotEPUB.format+")', '"+dotEPUB.type+"', '"+host+"', "+alen+");ga('send', 'event', 'Bookver ("+bookversion+")', '"+dotEPUB.type+"', '"+loc.protocol+'//'+host+"');<\/script><\/head><body><\/body><\/html>"
						);
						iframeDoc.close();
					}
				}
			}

			// modify by zhangcong
			chrome.extension.sendRequest({type: "onyx-getcontent", title: article.title, content: article.content, url: window.location.href}, function(response) {
			  // console.log(response.farewell);
			});
			
			return;

			/*Send info to server */
			var form = document.createElement("form");
			form.setAttribute("action", dotEPUB.path);
			form.setAttribute("method", "post");
			form.setAttribute("accept-charset", "utf-8");

			dotEPUB.field(form,"format",dotEPUB.format); //0.7.0
			dotEPUB.field(form,"title",article.title); //document.title
			dotEPUB.field(form,"html",article.content);

			dotEPUB.field(form,"url",
				(dotEPUB.type!=="Link") ?
					window.location.href
				:
					dotEPUB_url
			);

			dotEPUB.field(form,"author",author);
			dotEPUB.field(form,"copy",copy);
			dotEPUB.field(form,"flags",dotEPUB.flags);
			dotEPUB.field(form,"links",dotEPUB.links);
			dotEPUB.field(form,"lang",dotEPUB_lang);
			dotEPUB.field(form,"imgs",dotEPUB.imgs);
			dotEPUB.field(form,"wlang",dotEPUB.wlang);
			dotEPUB.field(form,"v",dotEPUB.version+" / "+dotEPUB.type.substring(0,1).toLowerCase()+dotEPUB_bookver+" "+(dotEPUB.imgs===1?"I":"")+(dotEPUB.links===1?"L":"")); //Before 0.8.13, only dotEPUB.version.
			dotEPUB.field(form,"s",dotEPUB.s([5,3,100,2,0,4,33,1,255,document]));

			//0.7.1 setTimeout added
			
			window.setTimeout(
				function() {
					dotEPUB.removeStatus();
					if(dotEPUB.type==="Link"){ //està definit URL per definició
						//window.location.href=dotEPUB_url;
						var b=document.body;
						b.style.display="block"; //show
						b.innerHTML="<h1 style=\"padding: 10px;background-color: #85ba25;color: #fff;font-size: 20px;font-family: 'Trebuchet MS',verdana,sans-serif;}\">"+dotEPUB.messages["theend1"][dotEPUB_lang]+'<a style="color: #fff; text-decoration: underline" href="'+dotEPUB_url+'">'+dotEPUB.messages["theend2"][dotEPUB_lang]+"</a>.</h1>";
					}
				},
				3000
			);

			document.body.appendChild(form);
			form.submit();
			form.parentNode.removeChild(form);
	},

	escapePre: function(){
		var pre=dotEPUB.doc.getElementsByTagName("pre");
		if (pre.length>0){
			dotEPUB.addFlag("pre");
			dbg("dotEPUB: pre found");
		}
		for(var i=0; i<pre.length; i++){
	        rd.clean(pre[i], "img");
	        rd.clean(pre[i], "a");
			//0.7.8 textContent instead of innerHTML que creaba marques de tancament amb atributs
			// Problem is: all markup will be gone...
			pre[i].textContent = pre[i].textContent.replace(/\n/g,"{_dotepub_cr_}").replace(/ /g,"{_dotepub_sp_}");
		}
	},

	footnotes: function(){ /* Add footnotes to main content if not in it */
		var fn=document.getElementById("footnotes");
		if (!fn){
			fn=dotEPUB.gelByClass(document, "footnotes")[0];
		}
		if (fn){
			return "<div class=\"dotEPUBfn\">"+fn.innerHTML+"</div>";
		}
		return false;
	},

	s: function(val){
		var n=dotEPUB.form(x,val[4],val[1],r,q,o,j,val[2],val[3],val[4]);
		var o=dotEPUB.form(val[4],n,val[1],r,q,o,j,val[9],val[5],n);
		var j=dotEPUB.form(val[7],n,val[1],r,q,o,j,val[6],val[7],o);
		var c=dotEPUB.form(val[5],n,val[3],r,q,o,j,val[0],val[3],j);
		var t=dotEPUB.form(val[1],n,val[1],r,q,o,j,j/11,val[7],c);
		var r=dotEPUB.form(val[3],n,val[5],r,q,o,j,val[2],c,t);
		var b=dotEPUB.form(val[4],n,val[1],r,q,o,j,val[8]-val[6]-val[5],val[7],r);
		var x=dotEPUB.form(val[3],n,6,r,q,o,j,val[2],c,t);
		var q=dotEPUB.form(x,n,val[0],r,q,o,j,val[0],val[7],x);
		var y=dotEPUB.form(x,n,val[4],r,q,o,j,val[0],val[4],x);
		var a=dotEPUB.form(x,n,val[7],r,q,o,j,val[0],val[7],x);
		var p=dotEPUB.form(x,n,val[0],r,q,o,j,val[0],val[7],y);
		var c=dotEPUB.form(x,n,val[7],r,p,o,j,val[0],val[7],x);
		var d=dotEPUB.form(y,q,val[7],r,p-val[5],o,j,val[0],val[7],x);
		var e=dotEPUB.form(x,n,val[0],r,q,o,j,val[0],val[7],0);
		return a+b+c+d+e;
	},

	/* Like readability clean() but removes videos too. */
	remove: function (e, tag) {
		var targetList=e.getElementsByTagName( tag );
		for (var y=targetList.length-1; y >= 0; y--) {
			targetList[y].parentNode.removeChild(targetList[y]);
		}
	},

	removeClass: function (e, c) {
		var targetList=dotEPUB.gelByClass(e, c);
		for (var y=targetList.length-1; y >= 0; y--) {
			targetList[y].parentNode.removeChild(targetList[y]);
		}
	},

	/* 0.8.3 Retrieve Evernote Clearly content */
	clearly: function (){
		var clearly=document.getElementById('readable_iframe');
		var oDoc = (clearly.contentWindow || clearly.contentDocument);
		if (oDoc.document) { oDoc = oDoc.document; }
		var clearlytext=oDoc.getElementById('text').cloneNode(true);
		dotEPUB.removeClass(clearlytext, "none");
		dotEPUB.removeClass(clearlytext, "pageSeparator");
		var divclearly=document.createElement("div");
		divclearly.className="dotEPUBcontent";
		divclearly.style.display = 'none';
		divclearly.appendChild(clearlytext);
		/* Remove divs */
		divclearly.innerHTML=divclearly.innerHTML.replace(/<div[^>]*>/g,'');
		divclearly.innerHTML=divclearly.innerHTML.replace(/<\/div>/g,'');
		document.getElementsByTagName('body')[0].appendChild(divclearly);
	},

	messages: {
		"choose" : {
			"en" : "Choose a format", 
			"es" : "Escoge un formato", 
			"ca" : "Escull un format"
		},
		"mode" : {
			"en" : "Mode", 
			"es" : "Modo", 
			"ca" : "Mode"
		},
		"nocontent" : {
			"en" : "dotEPUB is unable to process this page. If it's an article page, a blog entry, a story, etc. report this problem to info@dotepub.com.", 
			"es" : "dotEPUB no es capaz de procesar esta página. Si es una página de un artículo, una entrada de blog, un relato o similar, informa de este problema a info@dotepub.com.", 
			"ca" : "dotEPUB no és capaç de processar aquesta pàgina. Si és una pàgina d'un article, una entrada de blog, un relat o similar, informa d'aquest problema a info@dotepub.com."
		},
		"imgremoved" : {
			"en" : "Image removed", 
			"es" : "Imagen eliminada", 
			"ca" : "Imatge eliminada"
		},
		"manyimgs" : {
			"en" : "This page has too many images!\n\nWe cannot include them all, sorry.", 
			"es" : "¡Esta página contiene demasiadas imágenes!\n\nNo podemos incluirlas todas, sintiéndolo mucho.", 
			"ca" : "Aquesta pàgina conté massa imatges!\n\nNo podem incloure-les totes, sentint-ho molt."
		},
		"home" : {
			"en" : "dotEPUB.com is designed to process article pages, blog entries, stories, etc., not home pages.\n\nDo you want to proceed anyway?", 
			"es" : "dotEPUB.com está diseñado para procesar páginas de artículos, entradas de blogs, relatos, etc., no páginas principales.\n\n¿Deseas continuar de todas formas?", 
			"ca" : "dotEPUB.com està dissenyat per processar pàgines d'articles, entrades de blogs, relats, etc., no pàgines principals.\n\nVols continuar de totes formes?"
		},
		"imgs" : {
			"en" : "This page has images.\n\nIf they are not needed to understand the text, do NOT try to retrieve them: the conversion process will be much longer and the e-book file bigger.\n\nPress \"OK\" to try to retrieve the images.\n\nPress \"Cancel\" to continue without retrieving the images.", 
			"es" : "Esta página contiene imágenes.\n\nSi no son imprescindibles para la comprensión del texto, NO intentes recuperarlas: el proceso de conversión será mucho más largo y el fichero del e-book mucho más grande.\n\nPulsa \"Aceptar\" para tratar de recuperar las imágenes.\n\nPulsa \"Cancelar\" para continuar sin recuperar las imágenes.", 
			"ca" : "Aquesta pàgina conté imatges.\n\nSi no són imprescindibles per a la comprensió del text, NO intentis recuperar-les: el procés de conversió serà molt més llarg i el fitxer de l'e-book molt més gran.\n\nPrem \"Accepta\" per tractar de recuperar les imatges.\n\nPrem \"Cancel·la\" per continuar sense recuperar les imatges."
		},
		"videoremoved" : {
			"en" : "Video removed", 
			"es" : "Vídeo eliminado", 
			"ca" : "Vídeo eliminat"
		},
		"local" : {
			"en" : "This page is not on the Internet.\n\nWe cannot retrieve its images.\n\nThe conversion will be done using the immersive mode.\n\nDo you still want to proceed?",
			"es" : "Esta página no está en Internet.\n\nNo podemos recuperar las imágenes.\n\nLa conversión se efectuará usando el modo inmersivo.\n\n¿Deseas continuar de todas formas?", 
			"ca" : "Aquesta pàgina no és a Internet.\n\nNo podem recuperar les imatges.\n\nLa conversió serà efectuada utilizant el mode immersiu.\n\nVols continuar de totes formes?"
		},
		"toolong" : {
			"en" : "This page is very long!\n\nThe processing and downloading of the e-book may take some time (please be patient) and some e-readers may be unable to view it.\n\nDo you want to proceed?", 
			"es" : "¡Esta página es muy larga!\n\nEl procesamiento y descarga del libro electrónico puede durar un rato (por favor, sé paciente) y algunos e-readers quizás no sean capaces de visualizarlo.\n\n¿Deseas continuar de todas formas?", 
			"ca" : "Aquesta pàgina és molt llarga!\n\nEl processament i descàrrega del llibre electrònic pot trigar una estona (sisplau, sigues pacient) i alguns e-readers potser no siguin capaços de visualitzar-lo.\n\nVols continuar de totes formes?"
		},
		"tootoolong" : {
			"en" : "This page is very very very long!\nWe cannot accept it, sorry.", 
			"es" : "¡Esta página es muy muy muy larga!\nNo podemos aceptarla, sintiéndolo mucho.", 
			"ca" : "Aquesta pàgina és molt molt molt llarga!\nNo podem acceptar-la sentint-ho molt."
		},
		"cancel" : {
			"en" : "cancel",
			"es" : "cancelar",
			"ca" : "cancel·lar"
		},
		"progress" : {
			"en" : "Conversion in progress - message",
			"es" : "Conversi&oacute;n en curso",
			"ca" : "Conversi&oacute; en curs"
		},
		"title_epub" : {
			"en" : "used by most e-readers",
			"es" : "usado por la mayoría de los e-readers",
			"ca" : "utilitzat per la majoria dels e-readers"
		},
		"title_mobi" : {
			"en" : "for Amazon Kindle only",
			"es" : "solamente para Amazon Kindle",
			"ca" : "només per Amazon Kindle"
		},
		"links_0" : {
			"en" : "imm.",
			"es" : "inm.",
			"ca" : "imm."
		},
		"links_1" : {
			"en" : "non-imm.",
			"es" : "no inm.",
			"ca" : "no imm."
		},
		"title_0" : {
			"en" : "immersive: links, images and videos will be removed",
			"es" : "inmersivo: los enlaces, imágenes y vídeos serán eliminados",
			"ca" : "immersiu: els enllaços, imatges i vídeos seran eliminats"
		},
		"title_1" : {
			"en" : "non-immersive: links and images will be kept, videos will be linked",
			"es" : "no inmersivo: los enlaces e imágenes se mantendrán, los vídeos se enlazarán",
			"ca" : "no immersiu: els enllaços i imatges es mantindran, els vídeos s'enllaçaran"
		},
		"theend1" : {
			"en" : "Close this window once the download has completed or go to the ",
			"es" : "Cierra esta ventana una vez haya concluido la descarga o visita la ",
			"ca" : "Tanca aquesta finestra un cop hagi acabat la descàrrega o visita la "
		},
		"theend2" : {
			"en" : "original webpage",
			"es" : "página original",
			"ca" : "pàgina original"
		}
	},

	init: function(){
		dotEPUBstatus=document.getElementById("dotepub"); //0.7.1

		/*0.7.3
		if(typeof(dotEPUB_links)=="undefined"){
			dotEPUB_links=0;
		}
		*/
		//0.8.7
		if(typeof dotEPUB_links!= 'undefined'){
			dotEPUB.links=dotEPUB_links;
		}
		if(typeof(dotEPUB_lang)=="undefined"){
			dotEPUB_lang=dotEPUB.lang;
		}
		//0.7.0 (typeof dotEPUB_format== 'undefined') ? "epub" : dotEPUB_format
		if (typeof dotEPUB_format!= 'undefined'){
			dotEPUB.format=dotEPUB_format.toLowerCase();
			dotEPUB_format=undefined; //must be blanked for second execution on same page with 2 bookmarklet with/out dotEPUB_format defined
		}
		//0.7.1 New way of doing things: js injection even for Chrome & Firefox extension
		if (typeof dotEPUB_type!= 'undefined'){
			dotEPUB.type=dotEPUB_type;
		}
		// Si bé una url la donem per bona i mana: és type=Link (tant si no ho diu com si diu una altra cosa)
		if(typeof dotEPUB_url!=="undefined"){
			dotEPUB.type="Link";
		}

		//0.7.2
		var dotEPUB_imm=(dotEPUB.links)?"":" (i)"; //estava al revès fins a 0.7.3
		var setformat=(dotEPUB.format==="ask") ? "" : dotEPUB.format;//0.7.5
		var dotEPUB_info=document.createTextNode(setformat+dotEPUB_imm+" v."+dotEPUB.version);
		dotEPUB_d=document.createElement("div");
		dotEPUB_d.id="dotEPUB_info";
		dotEPUB_d.style.cssText="text-align:right;margin-top:-18px;margin-right:5px;font-family:Verdana, Sans-serif;font-size:11px;color:#000";
//		dotEPUB_d.appendChild(dotEPUB_info);
		document.getElementById("dotepub").getElementsByTagName('div')[0].appendChild(dotEPUB_d);

		if(window.location.host!="dotepub.com" && (window.location.protocol + "//" + window.location.host + "/") == window.location.href){
			if(!confirm(dotEPUB.messages["home"][dotEPUB_lang])){
				dotEPUB.removeStatus();
				return;
			}
		}

		//0.8.9
		dotEPUB.wlang=dotEPUB.getLang();

		/* Cloning */
		dotEPUB.doc = document.createElement("html");

		/* Is this a clearly document? (0.8.3) */
		if(document.getElementById("readable_iframe")){
			dotEPUB.clearly();
//			var clearly="clearly";
		}/*else{
			var clearly=0;
		}*/
		var doccont=document.getElementsByTagName('html')[0];
		var clonecont=doccont.cloneNode(true);
		dotEPUB.doc.appendChild(clonecont);

		//0.8.7
		if(dotEPUB.links=="ask"){
			dotEPUBstatus.getElementsByTagName("p")[0].firstChild.nodeValue=dotEPUB.messages["mode"][dotEPUB_lang]+": ";//modifiquem text existent
			dotEPUB.formatInput("links",0);
			dotEPUB.formatInput("links",1);
			dotEPUB.formatCancel();
		}else{
			dotEPUB.cleanclone();
		}
	},

	cleanclone: function(){
		/* Cleaning the cloned document */
		dotEPUB.escapePre();
		var footnote=dotEPUB.footnotes();
		var article=rd.init(/*clearly*/);
		article.content=article.content.replace(/<div id="dotepub"><div id="status"><p>[^<]*<\/p><\/div><\/div>/,''); //0.6.0
		if (footnote)	{
			article.content+=footnote;
		}

		if (article.content==""){ //probably quite unnecessary since 0.8.2: full body sent if nocontent after rd.init()
			alert(dotEPUB.messages["nocontent"][dotEPUB_lang]);
			dotEPUB.removeStatus();
		}else{
			if (article.title==""){
				article.title=window.location.href;
	            article.title = article.title.replace(/\//g,'/ ');
	            article.title = article.title.replace(/&/g,' &amp; ');
			}
			/* 0.8.5 Widget envia valor null */
			if (typeof dotEPUB_title!='undefined' && dotEPUB_title!='null'){
				article.title=dotEPUB_title;
			}else{
				article.title=(document.getElementById("dotEPUBtitle")) ? rd.getInnerText(document.getElementById("dotEPUBtitle")) : article.title;
			}

			var gauthor=dotEPUB.getAuthor(), metacopy=dotEPUB.meta("copyright");

			if(dotEPUB.format==="ask"){
				dotEPUBstatus.getElementsByTagName("p")[0].firstChild.nodeValue=dotEPUB.messages["choose"][dotEPUB_lang]+": ";//modifiquem text existent
				dotEPUB.formatInput("format","epub",article, gauthor, metacopy);
				dotEPUB.formatInput("format","mobi",article, gauthor, metacopy);
				dotEPUB.formatCancel();
			}else{
				dotEPUB.send(article, gauthor, metacopy);
			}
		}
	},

	formatCancel: function(){
		var vincle=document.createElement("a");
		var txt=document.createTextNode(dotEPUB.messages["cancel"][dotEPUB_lang]);
		vincle.appendChild(txt);
		//Trec a 0.8.13 vincle.style.cssText="padding-left:30px;text-decoration:underline;cursor:pointer;font-weight:normal;font-style:italic;color:#000";
		vincle.onclick=function(){
			dotEPUB.removeStatus();
		}
		//insertAfter
		dotEPUBstatus.getElementsByTagName("label")[1].parentNode.insertBefore(vincle, dotEPUBstatus.getElementsByTagName("label")[1].nextSibling);
	},

	formatInput: function(field,f,article,author,meta){
		if(field==="format"){
			var lit=f.toUpperCase();
			var info=f;
		}else{
			var lit=dotEPUB.messages["links_"+f][dotEPUB_lang];
			var info=(f) ? "" : "(i)";
		}

		var txt=document.createTextNode(lit);
		var input=document.createElement("input");
		input.id="dotEPUBparam"+f;
		input.type="radio";
		var label=document.createElement("label");
		//label.setAttribute("for",input.id);
		//Trec a label.style.cssText="font-weight:normal;";
		label.title=dotEPUB.messages["title_"+f][dotEPUB_lang];

		input.onclick=function(){
			dotEPUBstatus.getElementsByTagName("p")[0].innerHTML=dotEPUB.messages["progress"][dotEPUB_lang];
			dotEPUB[field]=f;
			var dotEPUBinfo=document.getElementById("dotEPUB_info");
			dotEPUBinfo.firstChild.nodeValue=info+" "+dotEPUBinfo.firstChild.nodeValue;
			if(field==="format"){
				dotEPUB.send(article,author,meta);
			}else{
				dotEPUB.cleanclone();
			}
		};

		label.appendChild(input);
		label.appendChild(txt);

		//dotEPUBstatus.getElementsByTagName("p")[0].appendChild(input);
		dotEPUBstatus.getElementsByTagName("p")[0].appendChild(label);
	},

	form: function(a,b,c,d,e,f,g,h,i,j){
		switch(c){
			case 0: return (((((a*b)+g+4)/3)+1)/10)-1;
			case 1: return d.charCodeAt(e);
			case 2: return f.location;
			case 3: return h;
			case 4: return i.href;
			case 5: return d.length+j;
			case 6: return (g*j)-b;
		}
	}
}

var dbg = (dotEPUB.debug && typeof console !== 'undefined') ? function(s) {
    console.log(".epub: " + s);
} : function() {};

/*
 * Readability. An Arc90 Lab Experiment. 
 * Website: http://lab.arc90.com/experiments/readability
 * Source:  http://code.google.com/p/arc90labs-readability
 *
 * "Readability" is a trademark of Arc90 Inc and may not be used without explicit permission. 
 *
 * Copyright (c) 2010 Arc90 Inc
 * Readability is licensed under the Apache License, Version 2.0.
**/
var rd = {
    version:                '1.6.2-1.7.0 + dotEPUB mod',
/*    emailSrc:               'http://lab.arc90.com/experiments/readability/email.php',*/
    iframeLoads:             0,
/*    convertLinksToFootnotes: false,*/
    frameHack:               false, /**
                                      * The frame hack is to workaround a firefox bug where if you
                                      * pull content out of a frame and stick it into the parent element, the scrollbar won't appear.
                                      * So we fake a scrollbar in the wrapping div.
                                     **/
    biggestFrame:            false,
    bodyCache:               null,   /* Cache the body HTML in case we need to re-use it later */
    flags:                   0x1 | 0x2 | 0x4,   /* Start with both flags set. */
    
    /* constants */
    FLAG_STRIP_UNLIKELYS: 0x1,
    FLAG_WEIGHT_CLASSES:  0x2,
	FLAG_CLEAN_CONDITIONALLY: 0x4,
    
    /**
     * All of the regular expressions in use within readability.
     * Defined up here so we don't instantiate them repeatedly in loops.
     **/
    regexps: {
        unlikelyCandidatesRe: /tool|combx|comment|disqus|extra|foot|header|menu|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|insider_ad|outbrain/i, // updated from 1.7.0 (1.6.2 was: /combx|comment|disqus|foot|header|menu|rss|shoutbox|sidebar|sponsor|ad-break|agegate/i) dotepub added tool (inclou article_bottom_tools toolbox pe ha d'estar al davant per donar prioritat sobre article)|insider_ad|outbrain
		okMaybeItsACandidateRe: /and|column|main|shadow/i, // updated from 1.7.0 (1.6.2 was: /and|article|body|column|main/i). dotepub0.8.2: removed: article|body
		positiveRe: /dotEPUBcontent|article|body|content|entry|hentry|main|page|pagination|post|full-text|text|blog|story|container|topmatter/i, // updated from 1.7.0 (1.6.2 was: /article|body|content|entry|hentry|page|pagination|post|text|blog|story/i) 1.8.2 full-text container topmatter
		negativeRe: /tool|combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|widget|utilidades|votos|coment|dablink|thumb|share|complementa|image|cbw|foto|insider_ad|section_heading show|section_heading hide|dotEPUBremove/i,// updated from 1.7.0 (1.6.2 was: /combx|comment|contact|foot|footer|footnote|masthead|media|meta|promo|related|scroll|shoutbox|sponsor|tags|widget|utilidades|votos|coment|dablink|thumb|share|complementa/i, //dotEPUB: added utilidades|votos|coment|editsection|article_related|dablink|thumb|share|info_complementa|caption|articleSpanImage|inlineImage|tool|insider_ad
		divToPElementsRe:       /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
        replaceBrsRe:           /(<br[^>]*>[ \n\r\t]*){2,}/gi,
        replaceFontsRe:         /<(\/?)font[^>]*>/gi,
        trimRe:                 /^\s+|\s+$/g,
        normalizeRe:            /\s{2,}/g,
        killBreaksRe:           /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
        videoRe:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i
		/* skipFootnoteLinkRe:     /^\s*(\[?[a-z0-9]{1,2}\]?|^|edit|citation needed)\s*$/i*/
    },

	/**
	 * Runs readability.
	 * 
	 * Workflow:
	 *  1. Prep the document by removing script tags, css, etc.
	 *  2. Build readability's DOM tree.
	 *  3. Grab the article content from the current dom tree.
	 *  4. Replace the current DOM tree with the new one.
	 *  5. Read peacefully.
	 *
	 * @return void
	 **/
	init: function(end) {
        /* Before we do anything, remove all scripts that are not dotepub. */
		window.onload = window.onunload = function() {};
		var scripts = dotEPUB.doc.getElementsByTagName('script');
		for(var i = scripts.length-1; i >= 0; i--){
			if(typeof(scripts[i].src)=="undefined" || scripts[i].src.indexOf('dotepub')==-1){
				scripts[i].nodeValue="";
				scripts[i].removeAttribute('src');
			    scripts[i].parentNode.removeChild(scripts[i]);
			}
		}

		if(dotEPUB.doc.getElementsByTagName('body')[0] && !rd.bodyCache){
			/*rd.bodyCache = dotEPUB.doc.getElementsByTagName('body')[0].innerHTML.replace(/<div id="status">(.*)<\/div>/i,'');*/
			rd.bodyCache = dotEPUB.doc.getElementsByTagName('body')[0].innerHTML.replace(/<div id="dotepub"><div id="status"><p>[^<]*<\/p><\/div><\/div>/i,''); //0.7.1
		}

		rd.prepDocument();

		var articleTitle   = rd.getArticleTitle();

		/* Evitar depuració es pitjor v. 0.8.2 
		if(end=="clearly"){
			var articleContent=dotEPUB.gelByClass(dotEPUB.doc, "dotEPUBcontent")[0];
			if(dotEPUB_links){
				dotEPUB.Absolutize(articleContent);
			}
			return {title:rd.getInnerText(articleTitle), content:articleContent.innerHTML};
		}
		*/
		var articleContent = rd.grabArticle();

		/**
         * If we attempted to strip unlikely candidates on the first run through, and we ended up with no content,
         * that may mean we stripped out the actual content so we couldn't parse it. So re-run init while preserving
         * unlikely candidates to have a better shot at getting our content out properly.
        **/
        /**
         * If we attempted to strip unlikely candidates on the first run through, and we ended up with no content,
         * that may mean we stripped out the actual content so we couldn't parse it. So re-run init while preserving
         * unlikely candidates to have a better shot at getting our content out properly.
        **/
        if(rd.getInnerText(articleContent, false).length < 250){
            if (rd.flagIsActive(rd.FLAG_STRIP_UNLIKELYS)) {
                rd.removeFlag(rd.FLAG_STRIP_UNLIKELYS);
                dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = rd.bodyCache;
                return rd.init();
            }
            else if (rd.flagIsActive(rd.FLAG_WEIGHT_CLASSES)) {
                rd.removeFlag(rd.FLAG_WEIGHT_CLASSES);
                dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = rd.bodyCache;
                return rd.init();              
            }
			else if (rd.flagIsActive(rd.FLAG_CLEAN_CONDITIONALLY)) {
				rd.removeFlag(rd.FLAG_CLEAN_CONDITIONALLY);
				dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = rd.bodyCache;
				return rd.init();
			}
			else if (!end) { //&& window.location.href.match(/^http:\/\/shakespeare.mit.edu/)
				dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = rd.bodyCache.replace(/<a ([^>]*)>(.*)<\/a><br>/gi,'<p>$2</p>').replace(/<blockquote([^>]*)>/gi,'<$1p>');
				return rd.init(1); //dotepub
			}
			else {
                articleContent.innerHTML = rd.bodyCache; //dotepub (0.8.2; before = "") Better something than nothing
            }
        }

		/* dotepub */
		if(dotEPUB.links){
			dotEPUB.Absolutize(articleContent);
		}
		return {title:rd.getInnerText(articleTitle), content:articleContent.innerHTML};
	},

    /**
     * Get the article title as an H1.
     *
     * @return void
     **/
    getArticleTitle: function () {
        var curTitle = "",
            origTitle = "";

			try {
				curTitle = origTitle = document.title;
				if(typeof curTitle != "string") { /* If they had an element with id "title" in their HTML */
					curTitle = origTitle = rd.getInnerText(dotEPUB.doc.getElementsByTagName('title')[0]);
					/*curTitle = origTitle = rd.getInnerText(document.getElementsByTagName('title')[0]);*/
				}
			}
			catch(e) {}


        if(curTitle.match(/ [\|\-] /)){
            curTitle = origTitle.replace(/(.*)[\|\-] .*/gi,'$1');
            
            if(curTitle.split(' ').length < 3) {
                curTitle = origTitle.replace(/[^\|\-]*[\|\-](.*)/gi,'$1');
            }
        }else if(curTitle.indexOf(': ') !== -1){
            curTitle = origTitle.replace(/.*:(.*)/gi, '$1');

            if(curTitle.split(' ').length < 3) {
                curTitle = origTitle.replace(/[^:]*[:](.*)/gi,'$1');
            }
        }else if(curTitle.length > 150 || curTitle.length < 15){
            var hOnes = dotEPUB.doc.getElementsByTagName('h1');
            if(hOnes.length == 1){
                curTitle = rd.getInnerText(hOnes[0]);
            }
        }

        curTitle = curTitle.replace( rd.regexps.trimRe, "" );

        if(curTitle.split(' ').length <= 4 && origTitle!="") {//dotepub segona condicio
            curTitle = origTitle;
        }
        
        var articleTitle = document.createElement("H1");
        articleTitle.innerHTML = curTitle;

        return articleTitle;
    },

	/**
	 * Prepare the HTML document for readability to scrape it.
	 * This includes things like stripping javascript, CSS, and handling terrible markup.
	 * 
	 * @return void
	 **/
	prepDocument: function () {
		/**
		 * In some cases a body element can't be found (if the HTML is totally hosed for example)
		 * so we create a new body node and append it to the document.
		 */
		if(dotEPUB.doc.getElementsByTagName('body')[0] === null){
			var body = document.createElement("body");
			try {
				dotEPUB.doc.getElementsByTagName('body')[0] = body;		
			} catch(e) {
				dotEPUB.doc.documentElement.appendChild(body);
                dbg(e);
			}
		}

		var frames = dotEPUB.doc.getElementsByTagName('frame');
		if(frames.length > 0){
            var bestFrame = null;
            var bestFrameSize = 0;    /* The frame to try to run readability upon. Must be on same domain. */
			var biggestFrameSize = 0; /* Used for the error message. Can be on any domain. */
            for(var frameIndex = 0; frameIndex < frames.length; frameIndex++){
                var frameSize = frames[frameIndex].offsetWidth + frames[frameIndex].offsetHeight;
                var canAccessFrame = false;
                try {
					frames[frameIndex].contentWindow.dotEPUB.doc.getElementsByTagName('body')[0];
					canAccessFrame = true;
                } catch(eFrames) {
                    dbg(eFrames);
                }

				if(frameSize > biggestFrameSize) {
					biggestFrameSize         = frameSize;
					rd.biggestFrame = frames[frameIndex];
				}
                
                if(canAccessFrame && frameSize > bestFrameSize){
                    rd.frameHack = true;
    
                    bestFrame = frames[frameIndex];
                    bestFrameSize = frameSize;
                }
            }
					
			if(bestFrame){
				var newBody = document.createElement('body');
				newBody.innerHTML = bestFrame.contentWindow.dotEPUB.doc.getElementsByTagName('body')[0].innerHTML;
				newBody.style.overflow = 'scroll';
				dotEPUB.doc.getElementsByTagName('body')[0] = newBody;
				
				var frameset = dotEPUB.doc.getElementsByTagName('frameset')[0];
				if(frameset) { frameset.parentNode.removeChild(frameset); }
			}
		}

		/* remove all stylesheets 
		for (var k=0;k < dotEPUB.doc.getElementsByTagName('style').length; k++) {
			if (dotEPUB.doc.getElementsByTagName('style')[k].href != null && dotEPUB.doc.getElementsByTagName('style')[k].href.lastIndexOf("readability") == -1) {
				dotEPUB.doc.getElementsByTagName('style')[k].disabled = true;
			}
		}*/

        /* Remove all style tags in head (not doing this on IE) - TODO: Why not? [dotEPUB: done] */
        var styleTags = dotEPUB.doc.getElementsByTagName("style");
        for (var st=0;st < styleTags.length; st++) {
            // REMOVED in dotepub 0.8.2: if (navigator.appName != "Microsoft Internet Explorer") { styleTags[st].textContent = ""; }
			styleTags[st].textContent = "";
        }

		/* Turn all double br's into p's */
		/* Note, this is pretty costly as far as processing goes. Maybe optimize later. */
		dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = dotEPUB.doc.getElementsByTagName('body')[0].innerHTML.replace(rd.regexps.replaceBrsRe, '</p><p>').replace(rd.regexps.replaceFontsRe, '<$1span>');

		//replace H1-H6 into <p><strong>        replaceBrsRe:           /(<br[^>]*>[ \n\r\t]*){2,}/gi,

/* Wasn't a good idea... removed in 0.8.6 as wikipedia didn't work correctly.
		dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = dotEPUB.doc.getElementsByTagName('body')[0].innerHTML.replace(/<h3[^>]*>/g, '<p><strong>');
		dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = dotEPUB.doc.getElementsByTagName('body')[0].innerHTML.replace(/<\/h3>/g, '</strong></p>');
*/
		dbg('****');

	},

    /**
     * Prepare the article node for display. Clean out any inline styles,
     * iframes, forms, strip extraneous <p> tags, etc.
     *
     * @param Element
     * @return void
     **/
    prepArticle: function (articleContent) {
		dbg('Article content before cleaning:'+articleContent.innerHTML);
        rd.cleanStyles(articleContent);
        rd.killBreaks(articleContent);

        dotEPUB.remove(articleContent, "noscript"); //0.5.1

        /* Clean out junk from the article content */
        rd.cleanConditionally(articleContent, "form");
        rd.cleanConditionally(articleContent, "button"); //wikipedia mobile show/hide button 0.6.3
		rd.clean(articleContent, "object"); //dotEPUB: remove flash but not some videos
		/* dotEPUB added */
        rd.clean(articleContent, "embed"); //dotEPUB: remove flash but not some videos
        dotEPUB.remove(articleContent, "applet");
		dotEPUB.remove(articleContent, "canvas");
        dotEPUB.remove(articleContent, "audio");
        dotEPUB.remove(articleContent, "nobr");
        dotEPUB.remove(articleContent, "wbr");
		/* rd.clean(articleContent, "h1"); dotEPUB cancelled */

        /**
         * If there is only one h2, they are probably using it
         * as a header and not a subheader, so remove it since we already have a header.

		dotEPUB cancelled 
        
		if(articleContent.getElementsByTagName('h2').length == 1) {
            rd.clean(articleContent, "h2"); }
*/

        rd.cleanHeaders(articleContent);

		dotEPUB.removeClass(articleContent, "magnify"); //0.8.6 wikipedia img to enlarge; remove before treating images

		var imgLinks="";
		if(dotEPUB.links){//Si 1 no es perden enllaços; si no, readability se'ls carrega 
			/* podria ser necessari protegir... Achtung: caldrà activar ElemRepl(), que està comentat...
				dotEPUB.ElemRepl(dotEPUB.doc,"figure","div");
				dotEPUB.ElemRepl(dotEPUB.doc,"figcaption","p");
			*/

			var arr=dotEPUB.imgLinks(articleContent); //User will be allowed to select img replace
			articleContent=arr[0];
			imgLinks=arr[1];
			dotEPUB.videoRepl(articleContent); //object embed video iframe
		}else{
			dotEPUB.remove(articleContent, "img");
	        dotEPUB.remove(articleContent, "object");
	        dotEPUB.remove(articleContent, "embed");
	        dotEPUB.remove(articleContent, "video");
		}
		dotEPUB.remove(articleContent, "iframe"); //0.6.0 No tots els iframes tenen a veure amb multimèdia: cal eliminar-los en tots casos, no només si links

		/* Do these last as the previous stuff may have removed junk that will affect these */
		rd.cleanConditionally(articleContent, "table");

		//rd.cleanConditionally(articleContent, "ul"); //dotepub 0.5.1
		rd.cleanConditionally(articleContent, "div"); //dotepub 0.6.0: al final no es comenta i es protegeixen imatges amb class

		/* Remove extra paragraphs */
        var articleParagraphs = articleContent.getElementsByTagName('p');
        for(var i = articleParagraphs.length-1; i >= 0; i--){
            var imgCount    = articleParagraphs[i].getElementsByTagName('img').length;
            var embedCount  = articleParagraphs[i].getElementsByTagName('embed').length;
            var objectCount = articleParagraphs[i].getElementsByTagName('object').length;
            
            if(imgCount === 0 && embedCount === 0 && objectCount === 0 && rd.getInnerText(articleParagraphs[i], false) == ''){
                articleParagraphs[i].parentNode.removeChild(articleParagraphs[i]);
            }
        }

        try {
            articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p')+imgLinks;
        }
        catch (e) {
            dbg("Cleaning innerHTML of breaks failed. This is an IE strict-block-elements bug. Ignoring.: " + e);
        }
	},
	
    /**
     * Initialize a node with the readability object. Also checks the
     * className/id for special names to add to its score.
     *
     * @param Element
     * @return void
    **/
    initializeNode: function (node) {
        node.rd = {"contentScore": 0};         

        switch(node.tagName) {
            case 'DIV':
                node.rd.contentScore += 5;
                break;

            case 'PRE':
            case 'TD':
            case 'BLOCKQUOTE':
                node.rd.contentScore += 3;
                break;
                
            case 'ADDRESS':
            case 'OL':
            case 'UL':
            case 'DL':
            case 'DD':
            case 'DT':
            case 'LI':
            case 'FORM':
                node.rd.contentScore -= 3;
                break;

            case 'H1':
            case 'H2':
            case 'H3':
            case 'H4':
            case 'H5':
            case 'H6':
            case 'TH':
                node.rd.contentScore -= 5;
                break;
        }
       
        node.rd.contentScore += rd.getClassWeight(node);
    },
	
    /***
     * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
     *               most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
     *
     * @return Element
    **/
    grabArticle: function () {
        var stripUnlikelyCandidates = rd.flagIsActive(rd.FLAG_STRIP_UNLIKELYS);

        /**
         * First, node prepping. Trash nodes that look cruddy (like ones with the class name "comment", etc), and turn divs
         * into P tags where they have been used inappropriately (as in, where they contain no other block level elements.)
         *
         * Note: Assignment from index for performance. See http://www.peachpit.com/articles/article.aspx?p=31567&seqNum=5
         * TODO: Shouldn't this be a reverse traversal?
        **/
        var node = null;
        var nodesToScore = [];
        for(var nodeIndex = 0; (node = dotEPUB.doc.getElementsByTagName('body')[0].getElementsByTagName('*')[nodeIndex]); nodeIndex++)//dotEPUB updated
        {
            /* Remove unlikely candidates */
            if (stripUnlikelyCandidates) {
                var unlikelyMatchString = node.className + node.id;
                if (
					unlikelyMatchString.search(rd.regexps.unlikelyCandidatesRe) !== -1 &&
                   	unlikelyMatchString.search(rd.regexps.okMaybeItsACandidateRe) == -1 &&
                   	node.tagName !== "BODY"
				)
                {
                    dbg("Removing unlikely candidate - " + unlikelyMatchString);
                    node.parentNode.removeChild(node);
                    nodeIndex--;
                    continue;
                }               
            }

            if (node.tagName === "P" || node.tagName === "TD" || node.tagName === "PRE") {
                nodesToScore[nodesToScore.length] = node;
            }

            /* Turn all divs that don't have children block level elements into p's */
            if (node.tagName === "DIV") {
                if (node.innerHTML.search(rd.regexps.divToPElementsRe) === -1) {
                    dbg("Altering div to p "+node.className);
                    var newNode = document.createElement('p');
                    try {
                        newNode.innerHTML = node.innerHTML;             
                        node.parentNode.replaceChild(newNode, node);
                        nodeIndex--;

                        nodesToScore[nodesToScore.length] = node;
                    }
                    catch(e) {
                        dbg("Could not alter div to p, probably an IE restriction, reverting back to div.: " + e);
                    }
                }
                /*else
                {
                    // EXPERIMENTAL dotEPUB: removed completely
                    for(var i = 0, il = node.childNodes.length; i < il; i++) {
                        var childNode = node.childNodes[i];
                        if(childNode.nodeType == 3) { // Node.TEXT_NODE
                            dbg("replacing text node with a p (dotEPUB: span) tag with the same content.");
                            var p = document.createElement('span'); //dotEPUB: p -> span
							p.innerHTML = childNode.nodeValue;
                            p.style.display = 'inline';
                            p.className = 'readability-styled';
                            childNode.parentNode.replaceChild(p, childNode);
                        }
                    }
                }*/
            } 
        }

        /**
         * Loop through all paragraphs, and assign a score to them based on how content-y they look.
         * Then add their score to their parent node.
         *
         * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
        **/
        var candidates = [];
        for (var pt=0; pt < nodesToScore.length; pt++) {
            var parentNode      = nodesToScore[pt].parentNode;
            var grandParentNode = parentNode ? parentNode.parentNode : null;
            var innerText       = rd.getInnerText(nodesToScore[pt]);

            if(!parentNode || typeof(parentNode.tagName) == 'undefined') {
                continue;
            }

            /* If this paragraph is less than 25 characters, don't even count it. */
            if(innerText.length < 25) {
                continue;
			}

            /* Initialize readability data for the parent. */
            if(typeof parentNode.rd == 'undefined'){
                rd.initializeNode(parentNode);
                candidates.push(parentNode);
            }

            /* Initialize readability data for the grandparent. */
            if(grandParentNode && typeof(grandParentNode.rd) == 'undefined' && typeof(grandParentNode.tagName) != 'undefined')
            {
                rd.initializeNode(grandParentNode);
                candidates.push(grandParentNode);
            }

            var contentScore = 0;

            /* Add a point for the paragraph itself as a base. */
            contentScore++;

            /* Add points for any commas within this paragraph */
            contentScore += innerText.split(',').length;
            
            /* For every 100 characters in this paragraph, add another point. Up to 3 points. */
            contentScore += Math.min(Math.floor(innerText.length / 100), 3);
            
            /* Add the score to the parent. The grandparent gets half. */
            parentNode.rd.contentScore += contentScore;

            if(grandParentNode) {
                grandParentNode.rd.contentScore += contentScore/2;             
            }
        }

        /**
         * After we've calculated scores, loop through all of the possible candidate nodes we found
         * and find the one with the highest score.
        **/
        var topCandidate = null;
        for(var c=0, cl=candidates.length; c < cl; c++){
            /**
             * Scale the final candidates score based on link density. Good content should have a
             * relatively small link density (5% or less) and be mostly unaffected by this operation.
            **/
            candidates[c].rd.contentScore = candidates[c].rd.contentScore * (1-rd.getLinkDensity(candidates[c]));

            dbg('Candidate: ' + candidates[c] + " (" + candidates[c].className + ":" + candidates[c].id + ") with score " + candidates[c].rd.contentScore);
			//dbg('Code: '+candidates[c].innerHTML);

            if(!topCandidate || candidates[c].rd.contentScore > topCandidate.rd.contentScore) {
                topCandidate = candidates[c];
			}
        }

        /**
         * If we still have no top candidate, just use the body as a last resort.
         * We also have to copy the body node so it is something we can modify.
         **/
        if (topCandidate === null || topCandidate.tagName == "BODY"){
            topCandidate = document.createElement("DIV");
            topCandidate.innerHTML = dotEPUB.doc.getElementsByTagName('body')[0].innerHTML;
            dotEPUB.doc.getElementsByTagName('body')[0].innerHTML = "";
            dotEPUB.doc.getElementsByTagName('body')[0].appendChild(topCandidate);
            rd.initializeNode(topCandidate);
        }

        /**
         * Now that we have the top candidate, look through its siblings for content that might also be related.
         * Things like preambles, content split by ads that we removed, etc.
        **/
        var articleContent        = document.createElement("DIV");
            articleContent.id     = "readability-content";
        var siblingScoreThreshold = Math.max(10, topCandidate.rd.contentScore * 0.2);
        var siblingNodes          = topCandidate.parentNode.childNodes;


        for(var s=0, sl=siblingNodes.length; s < sl; s++){
            var siblingNode = siblingNodes[s];
            var append      = false;

            dbg("Looking at sibling node: " + siblingNode + " (" + siblingNode.className + ":" + siblingNode.id + ")" + ((typeof siblingNode.rd != 'undefined') ? (" with score " + siblingNode.rd.contentScore) : ''));
            dbg("Sibling has score " + (siblingNode.rd ? siblingNode.rd.contentScore : 'Unknown'));

            if(siblingNode === topCandidate){
                append = true;
            }

            var contentBonus = 0;
            /* Give a bonus if sibling nodes and top candidates have the example same classname */
            if(siblingNode.className == topCandidate.className && topCandidate.className != "") {
                contentBonus += topCandidate.rd.contentScore * 0.2;
            }

            if(typeof siblingNode.rd != 'undefined' && (siblingNode.rd.contentScore+contentBonus) >= siblingScoreThreshold){
                append = true;
            }
            
            if(siblingNode.nodeName == "P") {
                var linkDensity = rd.getLinkDensity(siblingNode);
                var nodeContent = rd.getInnerText(siblingNode);
                var nodeLength  = nodeContent.length;
                
                if(nodeLength > 80 && linkDensity < 0.25){
                    append = true;
                }else if(nodeLength < 80 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1){
                    append = true;
                }
            }

            if(append){
                dbg("Appending node: " + siblingNode);

                var nodeToAppend = null;
                if(siblingNode.nodeName != "DIV" && siblingNode.nodeName != "P") {
                    /* We have a node that isn't a common block level element, like a form or td tag. Turn it into a div so it doesn't get filtered out later by accident. */
                    
                    dbg("Altering siblingNode of " + siblingNode.nodeName + ' to div.');
                    nodeToAppend = document.createElement('div');
                    try {
                        nodeToAppend.id = siblingNode.id;
                        nodeToAppend.innerHTML = siblingNode.innerHTML;
                    }catch(e){
                        dbg("Could not alter siblingNode to div, probably an IE restriction, reverting back to original.");
                        nodeToAppend = siblingNode;
                        s--;
                        sl--;
                    }
                } else {
                    nodeToAppend = siblingNode;
                    s--;
                    sl--;
                }
                
                /* To ensure a node does not interfere with readability styles, remove its classnames */
                nodeToAppend.className = "";

                /* Append sibling and subtract from our list because it removes the node when you append to another node */
                articleContent.appendChild(nodeToAppend);
            }
        }


        /**
         * So we have all of the content that we need. Now we clean it up for presentation.
        **/
        rd.prepArticle(articleContent);
        
        return articleContent;
    },
	
    /**
     * Get the inner text of a node - cross browser compatibly.
     * This also strips out any excess whitespace to be found.
     *
     * @param Element
     * @return string
    **/
    getInnerText: function (e, normalizeSpaces) {
        var textContent    = "";

		if(typeof(e.textContent) == "undefined" && typeof(e.innerText) == "undefined") {
			return "";
		}

        normalizeSpaces = (typeof normalizeSpaces == 'undefined') ? true : normalizeSpaces;

        if (navigator.appName == "Microsoft Internet Explorer") {
            textContent = e.innerText.replace( rd.regexps.trimRe, "" ); }
        else {
            textContent = e.textContent.replace( rd.regexps.trimRe, "" ); }

        if(normalizeSpaces) {
            return textContent.replace( rd.regexps.normalizeRe, " "); }
        else {
            return textContent; }
    },

    /**
     * Get the number of times a string s appears in the node e.
     *
     * @param Element
     * @param string - what to split on. Default is ","
     * @return number (integer)
    **/
    getCharCount: function (e,s) {
        s = s || ",";
        return rd.getInnerText(e).split(s).length-1;
    },

    /**
     * Remove the style attribute on every e and under.
     * TODO: Test if getElementsByTagName(*) is faster.
     *
     * @param Element
     * @return void
    **/
    cleanStyles: function (e) {
        e = e || doc;
        var cur = e.firstChild;

        if(!e) {
            return; }

        // Remove any root styles, if we're able.
        if(typeof e.removeAttribute == 'function') {/* && e.className != 'readability-styled'*/
            e.removeAttribute('style'); }

        // Go until there are no more child nodes
        while ( cur !== null ) {
            if ( cur.nodeType == 1 ) {
                // Remove style attribute(s) :
                //if(cur.className != "readability-styled") {
                    cur.removeAttribute("style");                   
                //}
                rd.cleanStyles( cur );
            }
            cur = cur.nextSibling;
        }           
    },

	/**
	 * Get the density of links as a percentage of the content
	 * This is the amount of text that is inside a link divided by the total text in the node.
	 * 
	 * @param Element
	 * @return number (float)
	**/
	getLinkDensity: function (e) {
		var links      = e.getElementsByTagName("a");
		var textLength = rd.getInnerText(e).length;
		var linkLength = 0;
		for(var i=0, il=links.length; i<il;i++)
		{
			linkLength += rd.getInnerText(links[i]).length;
		}		

		return linkLength / textLength;
	},
	
	    /**
     * Get an elements class/id weight. Uses regular expressions to tell if this 
     * element looks good or bad.
     *
     * @param Element
     * @return number (Integer)
    **/
    getClassWeight: function (e) {
        if(!rd.flagIsActive(rd.FLAG_WEIGHT_CLASSES)) {
            return 0;
        }

        var weight = 0;

        /* Look for a special classname */
        if (typeof(e.className) === 'string' && e.className != ''){
            if(e.className.search(rd.regexps.negativeRe) !== -1) { weight -= 25; }
            if(e.className.search(rd.regexps.positiveRe) !== -1) { weight += 25; }
        }

        /* Look for a special ID */
        if (typeof(e.id) === 'string' && e.id != ''){
            if(e.id.search(rd.regexps.negativeRe) !== -1) { weight -= 25; }
            if(e.id.search(rd.regexps.positiveRe) !== -1) { weight += 25; }
        }

        return weight;
    },

	nodeIsVisible: function (node) {
		return (node.offsetWidth !== 0 || node.offsetHeight !== 0) && node.style.display.toLowerCase() !== 'none';
	},

    /**
     * Remove extraneous break tags from a node.
     *
     * @param Element
     * @return void
     **/
    killBreaks: function (e) {
        try {
            e.innerHTML = e.innerHTML.replace(rd.regexps.killBreaksRe,'<br />');       
        }
        catch (eBreaks) {
            dbg("KillBreaks failed - this is an IE bug. Ignoring.: " + eBreaks);
        }
    },

    /**
     * Clean a node of all elements of type "tag".
     * (Unless it's a youtube/vimeo video. People love movies.)
     *
     * @param Element
     * @param string tag to clean
     * @return void
     **/
    clean: function (e, tag) {
        var targetList = e.getElementsByTagName( tag );
        var isEmbed    = (tag == 'object' || tag == 'embed');
        
        for (var y=targetList.length-1; y >= 0; y--) {
            // Allow youtube and vimeo videos through as people usually want to see those.
            if(isEmbed) {
                var attributeValues = "";
                for (var i=0, il=targetList[y].attributes.length; i < il; i++) {
                    attributeValues += targetList[y].attributes[i].value + '|';
                }
                
                // First, check the elements attributes to see if any of them contain youtube or vimeo
                if (attributeValues.search(rd.regexps.videoRe) !== -1) {
                    continue;
                }

                // Then check the elements inside this element for the same.
                if (targetList[y].innerHTML.search(rd.regexps.videoRe) !== -1) {
                    continue;
                }
                
            }

			targetList[y].parentNode.removeChild(targetList[y]);
        }
    },

	/**
     * Clean an element of all tags of type "tag" if they look fishy.
     * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
     *
     * @return void
     **/
    cleanConditionally: function (e, tag) {

		//dotepub: return if class dotEPUBProtected is present
		if(e.innerHTML.search(/dotEPUBProtected/i)!==-1 || !rd.flagIsActive(rd.FLAG_CLEAN_CONDITIONALLY)) {
			return;
		}

        var tagsList      = e.getElementsByTagName(tag);
        var curTagsLength = tagsList.length;

        /**
         * Gather counts for other typical elements embedded within.
         * Traverse backwards so we can remove nodes at the same time without effecting the traversal.
         *
         * TODO: Consider taking into account original contentScore here.
        **/
        for (var i=curTagsLength-1; i >= 0; i--) {
            var weight = rd.getClassWeight(tagsList[i]);
            var contentScore = (typeof tagsList[i].rd != 'undefined') ? tagsList[i].rd.contentScore : 0;

			dbg("Cleaning Conditionally " + tagsList[i] + " (" + tagsList[i].className + ":" + tagsList[i].id + ")" + ((typeof tagsList[i].rd != 'undefined') ? (" with score " + tagsList[i].rd.contentScore) : ''));

            if(weight+contentScore < 0){
                tagsList[i].parentNode.removeChild(tagsList[i]);
            }else if ( rd.getCharCount(tagsList[i],',') < 10) {
                /**
                 * If there are not very many commas, and the number of
                 * non-paragraph elements is more than paragraphs or other ominous signs, remove the element.
                **/
                var p      = tagsList[i].getElementsByTagName("p").length;
                var img    = tagsList[i].getElementsByTagName("img").length;
                var li     = tagsList[i].getElementsByTagName("li").length-100;
                var input  = tagsList[i].getElementsByTagName("input").length;

                var embedCount = 0;
                var embeds     = tagsList[i].getElementsByTagName("embed");
				for(var ei=0,il=embeds.length; ei < il; ei++) {
                    if (embeds[ei].src.search(rd.regexps.videoRe) == -1) {
                      embedCount++; 
                    }
                }
                var linkDensity   = rd.getLinkDensity(tagsList[i]);
                var contentLength = rd.getInnerText(tagsList[i]).length;
                var toRemove      = false;

                if ( img > p ) {
                    toRemove = true;
                } else if(li > p && tag != "ul" && tag != "ol") {
                    toRemove = true;
                } else if( input > Math.floor(p/3) ) {
                    toRemove = true; 
                } else if(contentLength < 25 && (img === 0 || img > 2) ) {
                    toRemove = true;
                } else if(weight < 25 && linkDensity > 0.2) {
                    toRemove = true;
                } else if(weight >= 25 && linkDensity > 0.5) {
                    toRemove = true;
                } else if((embedCount == 1 && contentLength < 75) || embedCount > 1) {
                    toRemove = true;
                }

                if(toRemove) {
                   tagsList[i].parentNode.removeChild(tagsList[i]);
				}
            }
        }
    },

    /**
     * Clean out spurious headers from an Element. Checks things like classnames and link density.
     *
     * @param Element
     * @return void
    **/
    cleanHeaders: function (e) {
        for (var headerIndex = 1; headerIndex < 3; headerIndex++) {
            var headers = e.getElementsByTagName('h' + headerIndex);
            for (var i=headers.length-1; i >=0; i--) {
                if (rd.getClassWeight(headers[i]) < 0 || rd.getLinkDensity(headers[i]) > 0.33) {
                    headers[i].parentNode.removeChild(headers[i]);
                }
            }
        }
    },
	
	htmlspecialchars: function (s) {
		if (typeof(s) == "string") {
			s = s.replace(/&/g, "&amp;");
			s = s.replace(/"/g, "&quot;");
			s = s.replace(/'/g, "&#039;");
			s = s.replace(/</g, "&lt;");
			s = s.replace(/>/g, "&gt;");
		}
	
		return s;
	},

    flagIsActive: function(flag) {
        return (rd.flags & flag) > 0;
    },
    
    addFlag: function(flag) {
        rd.flags = rd.flags | flag;
    },
    
    removeFlag: function(flag) {
        rd.flags = rd.flags & ~flag;
    }

};

dotEPUB.init();


		}catch(e){
			w.alert(load);
		}
	}
);