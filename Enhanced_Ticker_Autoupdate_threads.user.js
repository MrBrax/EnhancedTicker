// ==UserScript==
// @name        Enhanced Ticker: Autoupdate threads
// @namespace   MrBrax
// @description	Updates threads automatically if the ticker is open. Requires "Enhanced Ticker" 3.32 or upwards.
// @updateURL   https://github.com/MrBrax/EnhancedTicker/raw/master/Enhanced_Ticker_Autoupdate_threads.user.js
// @downloadURL https://github.com/MrBrax/EnhancedTicker/raw/master/Enhanced_Ticker_Autoupdate_threads.user.js
// @include     https://facepunch.com/showthread.php?*
// @include     https://facepunch.com/subscription.php*
// @include     https://facepunch.com/usercp.php*
// @include		https://facepunch.com/fp_read.php*
// @include		https://facepunch.com/fp_popular.php*
// @include		https://facepunch.com/forumdisplay.php*
// @version     0.25
// @grant       GM_addStyle
// ==/UserScript==

if(!localStorage.getItem("ETicker_UnreadPosts") ){
	console.log("[AU] No UnreadPosts JSON");
	localStorage.setItem("ETicker_UnreadPosts", "{}");
}
if(!JSON.parse(localStorage.getItem("ETicker_UnreadPosts"))){
	console.log("[AU] Corrupted UnreadPosts JSON");
	localStorage.setItem("ETicker_UnreadPosts", "{}");
}

cfg = window.localStorage.getItem("ETickerConfig");
if(cfg){
	cfg = JSON.parse(cfg);
}

function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = Math.floor(seconds / 31536000);

    if (interval > 0) {
        return interval + " Year" + ( interval != 1 ? "s" : "");
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 0) {
        return interval + " Month" + ( interval != 1 ? "s" : "");
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 0) {
        return interval + " Day" + ( interval != 1 ? "s" : "");
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 0) {
        return interval + " Hour" + ( interval != 1 ? "s" : "");
    }
    interval = Math.floor(seconds / 60);
    if (interval > 0) {
        return interval + " Minute" + ( interval != 1 ? "s" : "");
    }
    return Math.floor(seconds) + " second" + ( seconds != 1 ? "s" : "");
}

function newPost( data ){
	var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
	if(!unread_data[ data.t ]) unread_data[ data.t ] = {};
	if( unread_data[ data.t ][ data.p ] ) return;
	unread_data[ data.t ][ data.p ] = {
		i: data.i, // userid
		u: data.u, // username
		d: data.d  // timestamp
	};
	localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));
}

GM_addStyle(".au_bar { background: #cce; border: 1px solid #777; border-bottom-width: 0; clear: both; display: block; font: 12px Tahoma; padding: 4px; width: 100%; box-sizing: border-box; }");

GM_addStyle("@keyframes auflash { 0% { background-color: #A9BEE2; } 100% { background-color: #fff; } }");
GM_addStyle(".au_flash { animation: 10s auflash; }");
GM_addStyle(".au_unread { background: #D1D4F6; }");

var thread = location.href.match(/\?t=([0-9]+)/);

var threadlist_page = location.href.match(/(usercp|subscription|fp_read|popular|forumdisplay)\.php/);

if( thread ){

	var paginator = document.getElementById("yui-gen1");
	var plist = document.getElementById("posts");

	var last_page = true;

	// check which page, stop if not on last
	if( paginator ){
		var s = paginator.innerHTML.trim().match(/Page ([0-9]+) of ([0-9]+)/);
		if(s[1] != s[2]){
			var au_info = document.createElement("div");
			au_info.className = "au_bar";
			au_info.innerHTML = "<strong>[ETAUT " + GM_info.script.version + "] Auto updater not running, go to the last page.</strong>";
			plist.appendChild(au_info);
			last_page = false;
		}
	}

	var title = document.title;
	var newposts = 0;

	//var unseenPosts = {};

	var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
	if( unread_data[ parseInt(thread[1]) ] ){
		//unseenPosts = unread_data[ parseInt(thread[1]) ];
		newposts = Object.keys( unread_data[ parseInt( thread[1] ) ] ).length;

		var first_post = document.querySelector("#posts li:first-child");
		if(first_post){
			first_post = first_post.id.replace("post_", "");
			for(i in unread_data[ parseInt(thread[1]) ] ){
				if(first_post > i){ console.log("Clean up old post: " + i); delete unread_data[ parseInt(thread[1]) ][ i ]; }
			}
		}
	}

	var t = document.querySelectorAll(".date");
	for(var i = 0; i < t.length; ++i){
		t[i].setAttribute( "data-timesince", new Date( t[i].title ).getTime() );
	}

	if(last_page){
		document.title = "[" + newposts + "] " + title;

		var au_info = document.createElement("div");
		au_info.className = "au_bar";
		au_info.innerHTML = "<strong>[ETAUT " + GM_info.script.version + "] New posts will appear below if ticker is open</strong>";
		plist.appendChild(au_info);
	
		var storageHandler = function (e) {

			var is_new = e.key == "ETicker_LastPost";
			var is_updated = e.key == "ETicker_UpdatePost"

			if( is_new || is_updated ){

				var d = JSON.parse(e.newValue);

				if(d.b) is_new = false;

				if(d.t == thread[1]){

					var post_exist = document.getElementById("post_" + d.p );

					if( post_exist && !d.b ){
						console.log("Post already exists: " + d.p );
						return;
					}

					var url = "https://facepunch.com/showthread.php?t=" + d.t + "&p=" + d.p;

					console.log("Update thread", thread[1], url);

					var xhr = new XMLHttpRequest();
					xhr.open("GET", url, true);
					xhr.responseType = "document";
					xhr.onreadystatechange = function (){
						if (xhr.readyState == 4 && xhr.status == 200){

							var data = xhr.responseXML;
							var newp = data.getElementById("post_" + d.p );

							if(newp){
								// new page notifier
								if(newp.parentNode.childNodes[1] == newp){
									var d_paginator = data.getElementById("yui-gen1");
									if(d_paginator){
										page = d_paginator.match(/Page ([0-9]+)/)[1];
									}else{
										page = 2;
									}
									var s = document.createElement("div");
									s.className = "au_bar";
									s.innerHTML = "<strong><a href='https://facepunch.com/showthread.php?t=" + d.t + "&page=" + page + "'>Page " + page + "</a></strong>";
									plist.appendChild(s);
									console.log("new page");
								}

								var df = newp.querySelector(".date");
								if(df) df.setAttribute( "data-timesince", new Date( df.title ).getTime() );

								// add new post
								if( is_new ){
									newp.className = newp.className.replace("postbitold", "postbitnew");
									plist.appendChild(newp);
								}else{
									post_exist.innerHTML = newp.innerHTML;
								}
							}

							// update title
							if( is_new ){

								//var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
								//if(!unread_data[ d.t ]) unread_data[ d.t ] = {};
								//unread_data[ d.t ][ d.p ] = 1;
								//localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));

								unseenPosts[ d.p ] = true;
								document.title = "[" + ( Object.keys(unseenPosts).length ) + "] " + title;
							}

							// update ratings
							var ratings = data.querySelectorAll(".rating_results");
							for(i in ratings){
								var res = document.getElementById( ratings[i].id );
								if(res) res.innerHTML = ratings[i].innerHTML;
							}

						}
					};
					xhr.send();
				}
			}
		};

		window.addEventListener("storage", storageHandler, false);

	}

	var new_posts = document.querySelectorAll(".postcontainer.postbitnew");
	var scrollHandler = function (e) {

		for(var i = 0; i < new_posts.length; ++i){

			var is_new = new_posts[i].className.indexOf("postbitnew") !== -1;
			var post_id = parseInt( new_posts[i].id.replace("post_", "") );

			if(is_new && new_posts[i].getBoundingClientRect().top < 0){
				console.log("Read new post: " + post_id + " in thread " + thread[1]);
				new_posts[i].className = new_posts[i].className.replace("postbitnew", "postbitold");
				localStorage.setItem("ETicker_ReadPost", JSON.stringify( { t: thread[1], p: post_id } ) );
			}

		}

		var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );

		if(!unread_data[ thread[1] ]) return;

		for( var i in unread_data[ thread[1] ] ){
			var element = document.getElementById("post_" + i);
			if( !element ){ 
				console.log("no element for post " + i + ", delete");				
				if( unread_data[ thread[1] ] && unread_data[ thread[1] ][ i ] ) delete unread_data[ thread[1] ][ i ];
				localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));
				continue;
			}
	  		if( element.getBoundingClientRect().top < 0 ) {
	  			console.log("Post now seen: " + i);
				//delete unseenPosts[ i ];
				element.className = element.className.replace("postbitnew", "postbitold");
				document.title = "[" + ( Object.keys(unread_data[ thread[1] ][ i ]).length ) + "] " + title;

				if( unread_data[ thread[1] ] && unread_data[ thread[1] ][ i ] ) delete unread_data[ thread[1] ][ i ];
				localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));
			}
		}
	}

	window.addEventListener('scroll', scrollHandler, false);

}else if( threadlist_page ){

	console.log( "[AU-" + threadlist_page[1] + "] Load: Unread posts", JSON.parse( localStorage.getItem("ETicker_UnreadPosts") ) );

	var visible_threads = {}

	var t = document.querySelectorAll("a.title");
	for(var i = 0; i < t.length; ++i ){
		if(!t[i].id) continue;
		visible_threads[ parseInt( t[i].id.replace("thread_title_", "") ) ] = true;
	}
	console.log("[AU-" + threadlist_page[1] + "] Load: Visible threads", visible_threads);

	function updateThread(id){
		
		var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") )[id];

		if(!unread_data){
			console.log( "[AU-" + threadlist_page[1] + "] No data for thread: " + id);
			return;
		}

		if(!document.getElementById("thread_" + id)){
			//console.log( "[AU-" + threadlist_page[1] + "] Thread not found on page: " + id);
			return;
		}


		// go through all threads on page and find all instances
		var tr = document.querySelectorAll(".threadbit");
		for(var i = 0; i < tr.length; ++i){
			if( parseInt( tr[i].id.replace("thread_", "") ) != id ) continue;

			var thread_name = tr[i].querySelector("a.title").innerHTML;

			var num = Object.keys( unread_data ).length;
			var npb = tr[i].querySelector(".au_unread"); // unread post box
			if( num == 0 ){
				if(npb) npb.style.display = "none";

				var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
				delete unread_data[id];
				localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));

			}else{

				if(!npb){
					npb = document.createElement("a");
					npb.className = "newposts au_unread";
					npb.href = "/showthread.php?t=" + id + "&p=" + Object.keys(unread_data)[0] + "#post" + Object.keys(unread_data)[0];
					npb.innerHTML = '<img src="/fp/newpost.gif"> ' + ( num ) + ' unread posts';
					npb.style.display = "inline-block";
					tr[i].querySelector(".threadtitle").appendChild(npb);
				}else{
					npb.style.display = "inline-block";
					npb.href = "/showthread.php?t=" + id + "&p=" + Object.keys(unread_data)[0] + "#post" + Object.keys(unread_data)[0];
					npb.innerHTML = '<img src="/fp/newpost.gif"> ' + ( num ) + ' unread posts';
				}

				var last_post = Object.keys( unread_data )[ Object.keys( unread_data ).length - 1 ];
				var d = unread_data[ last_post ];

				if(!d){
					console.log("thread no last post", unread_data, last_post, d);
				}

				if( typeof d == "number"){
					console.log("old thread info format", id);
					var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
					delete unread_data[id][last_post];
					localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));
					continue;
				}

				// set new poster & date
				var p_time = tr[i].querySelector(".threadlastpost dl dd:nth-child(2)");
				var p_by = tr[i].querySelector(".threadlastpost dl dd:nth-child(3)");

				var old_post = p_by.innerHTML.match(/\&amp;p=([0-9]+)/);
				if(old_post && old_post[1] != last_post && p_time.style.color != '#5F9F61'){
					console.log( "[AU-" + threadlist_page[1] + "] Inconsistent data: " + id + " (" + thread_name + "), " + last_post + " (" + old_post[1] + ")");
				}else{
					p_time.setAttribute("data-timesince", d.d);
					p_time.innerHTML = timeSince( d.d ) + " Ago";
					p_time.style.color = '#5F9F61';
					p_by.innerHTML = 'by <a href="member.php?u=' + d.i + '">' + d.u + '</a> <a href="showthread.php?t=' + id + '&amp;p=' + last_post + '#post' + last_post + '" class="lastpostdate understate" title="Go to last post"><img title="Go to last post" src="fp/vb/buttons/lastpost.gif" alt="Go to last post"></a>';
				}

				if( tr[i].old_post && tr[i].old_post != last_post ){
					//console.log("flash thread", id, tr[i].old_post, last_post); 
					tr[i].className = tr[i].className.replace("au_flash", "");
					tr[i].className = tr[i].className.replace("old ", "new ");
					
					(function(ind){
						setTimeout( function(){ tr[ind].className = tr[ind].className + " au_flash" }, 50);
					})(i);
				}
				tr[i].old_post = last_post;

			}
			
			//console.log( "[AU-" + threadlist_page[1] + "] Update thread td info", id, p_time, p_by);

		}
	}

	// update if something was missed
	function incRefresh(){
		var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
		if(!unread_data){
			console.error("[AU] Invalid UnreadPosts data", unread_data, unread_data.length);
			return;
		}
		console.log( "[AU-" + threadlist_page[1] + "] Auto update thread list (" + Object.keys(unread_data).length + " entries)");
		for( var i in unread_data ){
			if(!visible_threads[i]) continue;
			updateThread(i);
		}

		setTimeout(incRefresh, 10000);
	}

	var readPostCache = {};
	var firstPost = {};

	var tr = document.querySelectorAll(".threadbit");
	var first_thread = document.querySelector(".threadbit.sticky");
	if(!first_thread) first_thread = tr[0];

	console.log("first thread", first_thread.querySelector("a.title").innerHTML);

	var storageHandler = function (e) {
		if( e.key == "ETicker_LastPost" ){ // handle new posts (from ticker)

			var d = JSON.parse(e.newValue);

			if(!d.r && !cfg.au_all_threads) return; // only misc posts

			console.log("[AU-" + threadlist_page[1] + "] Receive new unrelated post from ticker: " + d.p + " in thread " + d.t);
			
			for(var i = 0; i < tr.length; ++i){
				if(!tr[i].id) continue;
				if( parseInt( tr[i].id.replace("thread_", "") ) != d.t ) continue;

				// set style
				tr[i].className = tr[i].className.replace("old ", "new ");
				
				// set new poster & date
				var p_time = tr[i].querySelector(".threadlastpost dl dd:nth-child(2)");
				var p_by = tr[i].querySelector(".threadlastpost dl dd:nth-child(3)");
				p_time.setAttribute("data-timesince", d.d);
				p_time.innerHTML = timeSince( d.d ) + " Ago";
				p_time.style.color = '#5F9F61';
				p_time.style.fontWeight = '700';
				p_by.innerHTML = 'by <a href="member.php?u=' + d.i + '">' + d.u + '</a> <a href="showthread.php?t=' + d.t + '&amp;p=' + d.p + '#post' + d.p + '" class="lastpostdate understate" title="Go to last post"><img title="Go to last post" src="fp/vb/buttons/lastpost.gif" alt="Go to last post"></a>';
				
				// flash
				if( tr[i].old_post && tr[i].old_post != d.p ){
					//console.log("flash thread", d.t, tr[i].old_post, d.p); 
					tr[i].className = tr[i].className.replace("au_flash", "");
					tr[i].className = tr[i].className.replace("old ", "new ");
					(function(ind){
						setTimeout( function(){ tr[ind].className = tr[ind].className + " au_flash" }, 50);
					})(i);
				}
				tr[i].old_post = d.p;

				// make new post box if it does not exist
				var npb = tr[i].querySelector(".au_unread");
				if(!npb){
					if(!firstPost[ d.t ]) firstPost[ d.t ] = d.p;
					var title = tr[i].querySelector(".threadtitle");
					npb = document.createElement("a");
					npb.className = "newposts au_unread";
					npb.href = "/showthread.php?t=" + d.t + "&p=" + firstPost[ d.t ] + "#post" + firstPost[ d.t ];
					npb.innerHTML = '<img src="/fp/newpost.gif"> 0 unread posts';
					title.appendChild(npb);
				}

				// add new post to counter
				var num = npb.innerHTML.match(/([0-9]+) unread post/);
				if(num){
					if(!firstPost[ d.t ]) firstPost[ d.t ] = d.p;
					num = parseInt(num[1]) + 1;
					npb.href = "/showthread.php?t=" + d.t + "&p=" + firstPost[ d.t ] + "#post" + firstPost[ d.t ];
					npb.innerHTML = '<img src="/fp/newpost.gif"> ' + num + ' unread post' + ( num != 1 ? "s" : "");
					npb.style.display = "inline-block";
				}

				// place at top

				tr[i].parentNode.insertBefore(tr[i], first_thread.nextSibling);

			}

		}else if( e.key == "ETicker_ReadPost" ){ // handle read new posts (from thread) (static in fp)
			
			var d = JSON.parse(e.newValue);
			console.log("[AU-" + threadlist_page[1] + "] Receive read post from thread: " + d.p + " in thread " + d.t);

			if(readPostCache[d.p]) return;

			for(var i = 0; i < tr.length; ++i){
				if(!tr[i].id) continue;
				if( parseInt( tr[i].id.replace("thread_", "") ) != d.t ) continue;
				
				// remove one post from new posts counter
				var npb = tr[i].querySelector(".au_unread");
				if(!npb) continue;
				var num = npb.innerHTML.match(/([0-9]+) unread post/);
				if(num){
					num = parseInt(num[1]) - 1;
					if(num <= 0){
						if(firstPost[ d.t ]) delete firstPost[ d.t ];
						npb.style.display = "none";
						tr[i].className = tr[i].className.replace("new ", "old ");
					}else{
						npb.style.display = "inline-block";
						npb.innerHTML = '<img src="/fp/newpost.gif"> ' + num + ' unread post' + ( num != 1 ? "s" : "");
					}
				}

			}

		}
	}

	incRefresh();

	window.addEventListener("storage", storageHandler, false);

}

function updateTime(){
	var q = document.querySelectorAll("dd[data-timesince], span[data-timesince]");
	if(q && q.length > 0){
		for(var i = 0; i < q.length; ++i){
			q[i].innerHTML = timeSince( q[i].getAttribute("data-timesince") ) + " Ago";
		}
	}
	setTimeout(updateTime, 10000);
}
updateTime();