﻿// ==UserScript==
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
// @version     0.23
// @grant       GM_addStyle
// ==/UserScript==

if( ! localStorage.getItem("ETicker_UnreadPosts") ) localStorage.setItem("ETicker_UnreadPosts", "{}");

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

GM_addStyle(".au_bar { background: #cce; border: 1px solid #777; border-bottom-width: 0; clear: both; display: block; font: 12px Tahoma; padding: 4px; width: 100%; box-sizing: border-box; }");

GM_addStyle("@keyframes auflash { 0% { background-color: #f00; } 100% { background-color: #fff; } }");
GM_addStyle(".au_flash { animation: 10s auflash; }");

var thread = location.href.match(/\?t=([0-9]+)/);

var threadlist_page = location.href.match(/(usercp|subscription|fp_read|popular)\.php/);

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

	var unseenPosts = {};

	var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
	if( unread_data[ parseInt(thread[1]) ] ){
		unseenPosts = unread_data[ parseInt(thread[1]) ];
		newposts = Object.keys(unseenPosts).length;

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

								var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
								if(!unread_data[ d.t ]) unread_data[ d.t ] = {};
								unread_data[ d.t ][ d.p ] = 1;
								localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));

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

		for(i in unseenPosts){
			var element = document.getElementById("post_" + i);
			if( !element ){ 
				console.log("no element for post " + i + ", delete");
				delete unseenPosts[ i ];
				var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
				if( unread_data[ thread[1] ] && unread_data[ thread[1] ][ i ] ) delete unread_data[ thread[1] ][ i ];
				localStorage.setItem("ETicker_UnreadPosts", JSON.stringify(unread_data));
				continue;
			}
	  		if( element.getBoundingClientRect().top < 0 ) {
	  			console.log("Post now seen: " + i);
				delete unseenPosts[ i ];
				element.className = element.className.replace("postbitnew", "postbitold");
				document.title = "[" + ( Object.keys(unseenPosts).length ) + "] " + title;

				var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
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
	for( i in t ){
		if(!t[i].id) continue;
		visible_threads[ parseInt( t[i].id.replace("thread_title_", "") ) ] = true;
	}
	console.log("[AU-" + threadlist_page[1] + "] Load: Visible threads", visible_threads);

	/*
	function applyUnread( auto ){

		console.log("Apply unread thread info", auto);

		var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
		
		for( i in unread_data ){

			var num = Object.keys(unread_data[i]).length;

			var npb = document.getElementById("unread_" + i); // unread post box

			var tr = document.getElementById("thread_" + i); // thread container

			var gotonew = document.getElementById("thread_gotonew_" + i); // new post box

			if(num == 0){
				if(npb) npb.parentNode.removeChild(npb);
				if(!gotonew) tr.className = tr.className.replace("new ", "old ");
				continue;
			}

			if(npb){
				npb.href = "/showthread.php?t=" + i + "&p=" + Object.keys(unread_data[i])[0] + "#post" + Object.keys(unread_data[i])[0];
				npb.innerHTML = '<img src="/fp/newpost.gif"> ' + ( num ) + ' unread posts';
				tr.className = tr.className.replace("old ", "new ");
				continue;
			}

			var a = document.getElementById("thread_title_" + i);

			if(a){
				var title = a.parentNode;
				var npb = document.createElement("a");
				npb.className = "newposts";
				npb.id = "unread_" + i;
				npb.href = "/showthread.php?t=" + i + "&p=" + Object.keys(unread_data[i])[0] + "#post" + Object.keys(unread_data[i])[0];
				npb.innerHTML = '<img src="/fp/newpost.gif"> ' + ( num ) + ' unread posts';
				title.appendChild(npb);
				tr.className = tr.className.replace("old ", "new ");
			}

		}

		// for if the user scrolls around, there's no localStorage.setItem event in FF
		if(auto) setTimeout(function(){ applyUnread(auto); }, 10000);
	}

	applyUnread(true);
	*/

	function incRefresh(){
		var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );
		for(var i = 0; i < unread_data.length; ++i ){
			updateThread(i, unread_data[i]);
		}

		setTimeout(incRefresh, 10000);
	}
	

	function updateThread(id, d){
		var unread_data = JSON.parse( localStorage.getItem("ETicker_UnreadPosts") );

		console.log( "[AU-" + threadlist_page[1] + "] Update list", id, d);

		// go through all threads on page and find all instances
		var tr = document.querySelectorAll(".threadbit");
		for(var i = 0; i < tr.length; ++i){
			if( parseInt( tr[i].id.replace("thread_", "") ) != id ) continue;
			//if(!unread_data[ id ] ) continue;

			//tr[i].className = tr[i].className.replace("au_flash", "");

			tr[i].className = tr[i].className.replace("old ", "new ");

			if(unread_data[ id ]){
				var num = Object.keys( unread_data[ id ] ).length;
				var npb = tr[i].querySelector(".au_unread"); // unread post box
				if( num == 0 ){
					if(npb) npb.parentNode.removeChild(npb);
					//if(!gotonew) tr.className = tr.className.replace("new ", "old ");
				}else{
					if(!npb){
						npb = document.createElement("a");
						npb.className = "newposts au_unread";
						npb.href = "/showthread.php?t=" + i + "&p=" + Object.keys(unread_data[ id ])[0] + "#post" + Object.keys(unread_data[ id ])[0];
						npb.innerHTML = '<img src="/fp/newpost.gif"> ' + ( num ) + ' unread posts';
						tr[i].querySelector(".threadtitle").appendChild(npb);
					}else{
						npb.href = "/showthread.php?t=" + i + "&p=" + Object.keys(unread_data[ id ])[0] + "#post" + Object.keys(unread_data[ id ])[0];
						npb.innerHTML = '<img src="/fp/newpost.gif"> ' + ( num ) + ' unread posts';
					}
				}
			}

			// set new poster & date
			var p_time = tr[i].querySelector(".threadlastpost dl dd:nth-child(2)");
			var p_by = tr[i].querySelector(".threadlastpost dl dd:nth-child(3)");
			p_time.setAttribute("data-timesince", d.d);
			p_time.innerHTML = timeSince( d.d ) + " Ago";
			p_time.style.color = '#5F9F61';
			p_by.innerHTML = 'by <a href="member.php?u=' + d.i + '">' + d.u + '</a> <a href="showthread.php?t=' + id + '&amp;p=' + d.p + '#post' + d.p + '" class="lastpostdate understate" title="Go to last post"><img title="Go to last post" src="fp/vb/buttons/lastpost.gif" alt="Go to last post"></a>';
			
			console.log("Update thread info", d.t, p_time, p_by);
		}
	}

	var readPostCache = {};
	var firstPost = {};

	var tr = document.querySelectorAll(".threadbit");

	var storageHandler = function (e) {
		if( e.key == "ETicker_LastPost" ){ // handle new posts (from ticker)
			var d = JSON.parse(e.newValue);
			console.log("[AU-" + threadlist_page[1] + "] Receive new post from ticker: " + d.p + " in thread " + d.t);
			
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
				
				// make new post box if it does not exist
				var npb = tr[i].querySelector(".newposts");
				if(!npb){
					if(!firstPost[ d.t ]) firstPost[ d.t ] = d.p;
					var title = tr[i].querySelector(".threadtitle");
					npb = document.createElement("a");
					npb.className = "newposts";
					npb.href = "/showthread.php?t=" + d.t + "&p=" + firstPost[ d.t ] + "#post" + firstPost[ d.t ];
					npb.innerHTML = '<img src="/fp/newpost.gif"> 0 new posts';
					title.appendChild(npb);
				}

				// add new post to counter
				var num = npb.innerHTML.match(/([0-9]+) new post/);
				if(num){
					if(!firstPost[ d.t ]) firstPost[ d.t ] = d.p;
					num = parseInt(num[1]) + 1;
					npb.href = "/showthread.php?t=" + d.t + "&p=" + firstPost[ d.t ] + "#post" + firstPost[ d.t ];
					npb.innerHTML = '<img src="/fp/newpost.gif"> ' + num + ' new post' + ( num != 1 ? "s" : "");
					npb.style.display = "inline-block";
				}

			}

		}else if( e.key == "ETicker_ReadPost" ){ // handle read new posts (from thread) (static in fp)
			var d = JSON.parse(e.newValue);
			console.log("[AU-" + threadlist_page[1] + "] Receive read post from thread: " + d.p + " in thread " + d.t);

			if(readPostCache[d.p]) return;

			for(var i = 0; i < tr.length; ++i){
				if(!tr[i].id) continue;
				if( parseInt( tr[i].id.replace("thread_", "") ) != d.t ) continue;
				
				// remove one post from new posts counter
				var npb = tr[i].querySelector(".newposts");
				if(!npb) continue;
				var num = npb.innerHTML.match(/([0-9]+) new post/);
				if(num){
					num = parseInt(num[1]) - 1;
					if(num <= 0){
						if(firstPost[ d.t ]) delete firstPost[ d.t ];
						npb.style.display = "none";
						tr[i].className = tr[i].className.replace("new ", "old ");
					}else{
						npb.style.display = "inline-block";
						npb.innerHTML = '<img src="/fp/newpost.gif"> ' + num + ' new post' + ( num != 1 ? "s" : "");
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