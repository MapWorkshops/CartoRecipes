// The MIT License (MIT)
//
// Copyright (c) 2015 Joris Kluivers
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

function Gallery(options) {
	if (options.container === undefined || options.userId === undefined || options.clientId === undefined) {
		console.log("Gallery missing required options: container, userId or clientId");
		return;
	}

	this.containerId = options.container;
	this.userId = options.userId;
	this.clientId = options.clientId;
	this.filterTags = options.tags || [];
	this.postMaxCount = options.maxPostCount || 20;
	this.cartodbUserId = options.cartodbUserId;
	this.cartodbApiKey = options.cartodbApiKey;
	this.cartodbTableName = options.cartodbTableName;

	this.loadFeed();
}
Gallery.prototype = {
	containerId: null,
	userId: null,
	clientId: null,
	filterTags: [],
	postsRendered: 0,
	postMaxCount: 20,
	cartodbUserId: null,
	cartodbApiKey: null,

	downloadURL: function() {
		return "https://api.instagram.com/v1/users/" + this.userId + "/media/recent?client_id=" + this.clientId;
	},

	/* Start loading a feed. Uses the recent post feed for the configured user. You can optionally
	provide a url to download from, if you have a next url from a previous response for example.
	*/
	loadFeed: function(nextURL) {
		var downloadURL = nextURL || this.downloadURL();

		var self = this;

		window.instagramCallback = function(data) {
			self.processData(data);
		}

		// jsonp
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.async = true;
		s.src = downloadURL + "&callback=instagramCallback";

		var st = document.getElementsByTagName('script')[0];
		st.parentNode.insertBefore(s, st);

		/*var xhr = new XMLHttpRequest();
		xhr.open("GET", downloadURL);

		var self = this;

		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4) {
				return;
			}

			if (xhr.status != 200) {
				console.log("Error loading feed");
			}

			self.processResponse(xhr.responseText);
		};

		xhr.send();*/
	},

	processData: function(json) {
		//var json = JSON.parse(text);

		if (json.data === undefined || json.data.length < 1) {
			// no posts to process
			return;
		}

		var posts = json.data.filter(this.postFilter, this);

		this.renderPosts(posts);

		var allowMorePosts = this.postsRendered < this.postMaxCount;
		var hasNextURL = json.pagination !== undefined && json.pagination.next_url !== undefined;

		if (allowMorePosts && hasNextURL) {
			// load next
			var nextURL = json.pagination.next_url;
			this.loadFeed(nextURL);
		} else {
			this.finished();
		}
	},

	postFilter: function(post) {
		if (this.filterTags.length < 1) {
			// accepts all posts if no tags to filter on
			return true;
		}

		// accept any post that matches one of the filter tags
		var tags = post.tags || [];
		for (var i=0; i<this.filterTags.length; i++) {
			if (tags.indexOf(this.filterTags[i]) != -1) {
				return true;
			}
		}

		return false;
	},

	renderPosts: function(posts) {
		var container = document.getElementById(this.containerId);

		for (var i=0; i<posts.length && this.postsRendered < this.postMaxCount; i++) {
			var postElement = this.renderPost(posts[i]);
			container.appendChild(postElement);

			this.postsRendered += 1;
		}
	},

	renderPost: function(post) {
		var thumbnailURL = post.images.low_resolution.url;

		var img = document.createElement("img");
		img.src = thumbnailURL;

		var postContainer = document.createElement("a");
		postContainer.setAttribute("href", post.link);
		postContainer.classList.add("post");

		var postWrapper = document.createElement("div");
		postWrapper.classList.add("wrapper");

		postContainer.appendChild(postWrapper);

		postWrapper.appendChild(img);

		var text = document.createElement("div");
		text.appendChild(document.createTextNode(post.caption.text));
		text.classList.add("title")
		postWrapper.appendChild(text)

		// Insert data into CartoDB
		if (post.caption &&
			post.caption.text &&
			post.location &&
			post.location.name &&
			post.location.latitude &&
			post.location.longitude &&
			post.images &&
			post.images.standard_resolution &&
			post.images.standard_resolution.url &&
			post.created_time) {

			// Build insert url
			var insertQ = "insert into " +
				this.cartodbTableName +
				"(the_geom, name, description, image_url, dt) values (CDB_LatLng(" +
				post.location.latitude +
				", " +
				post.location.longitude +
				"), '" +
				post.location.name +
				"', '" +
				post.caption.text +
				"', '" +
				post.images.standard_resolution.url +
				"', to_timestamp(" +
				post.created_time + ") at time zone 'CST')";

			callURL = "https://" + this.cartodbUserId + ".cartodb.com/api/v2/sql"

			console.log(insertQ);

			// Make API call
			$.ajax({
		    type: 'POST',
		    url: callURL,
		    crossDomain: true,
		    data: {"q":insertQ, "api_key": this.cartodbApiKey},
		    dataType: 'json',
		    success: function(responseData, textStatus, jqXHR) {
		      console.log("Data saved");
		    },
		    error: function (responseData, textStatus, errorThrown) {
		      console.log("Problem saving the data");
		    }
		  });
		}

		return postContainer;
	},

	finished: function() {
		//var container = document.getElementById(this.containerId);
		//container.innerHTML = '<p>' + this.postsRendered + ' images added to CartoDB table ' + this.cartodbTableName + '</p>';
		container.classList.add("finished");
	}
}
