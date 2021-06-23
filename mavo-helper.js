(function () {

    firebaseReady = new Promise((resolve,reject) => {
	(function loop () {
            if ((typeof(firebase) != "undefined") &&
		(firebase?.apps?.length > 0)) {
		resolve(firebase);
            } else {
		setTimeout(loop, 100)
            }
	})();
    });
    
    Promise.all([Mavo.inited,firebaseReady]).then(([m,fb])=> {
	let session = Mavo.get(document.querySelector('[mv-app=session]'));
	afterNap(()=>{console.log('woke '+(new Date()).toLocaleTimeString()); session.load()})
	fb.auth().onAuthStateChanged(signal);
    });


    let afterNap = function(f, nap = 10000) {
	let lastTime = Date.now();
	let inner = function() {
	    if (Date.now()-lastTime > nap) {
		f();
	    }
	    lastTime=Date.now();
	}
	setInterval(inner, 100);
    }
    
    let signal = function () {
	if (signal.ready) {
	    signal.ready=false;
	    setTimeout(() => {
		console.log('signal');
		signal.node?.render(signal.counter++);
		signal.ready=true;
	    },
		       1000);
	}
    }

    signal.counter=0;
    signal.ready=true;

    setSignal = function(id) {
	signal.node = Mavo.Node.get(document.getElementById(Mavo.value(id)));
	return signal.counter;
    }

    watchLoginState = function(uid) {
	if (Mavo.value(uid)) {
	    document.body.classList.remove('logged-out');
	    document.body.classList.add('logged-in');
	} else {
	    document.body.classList.remove('logged-in');
	    document.body.classList.add('logged-out');
	}
    }
    
    getUid = function() {
	try {
	    return firebase.auth().currentUser.uid;
	}
	catch (e) {
	    return undefined;
	}
    }

    getProfile = function() {
	try {
	    let u = firebase.auth().currentUser; 
	    return {uid: u.uid, name: u.displayName, photo: u.photoURL, email: u.email}
	}
	catch (e) {
	    return undefined;
	}
    }

    updateURLParam = function(name,value,title) {
	var u = new URL(window.location);
	var s = url.searchParams;
	s.set(name,value);
	url.search=s.toString;
	history.pushState("",title,url);
    }
    
    username = function() {
	try {
	    return firebase.auth().currentUser.displayName;
	}
	catch (e) {
	    return "";
	}
    }

    let users = []
    watchUsers = function(sid, backTime) {
	deepEqual = function(u,v) {
	    return JSON.stringify(u) == JSON.stringify(v);
	}
	firebaseReady.then(() => {
	    sid = Mavo.value(sid);

	    function parseQuery(querySnapshot) {
		let requestMap = {}
		, oldUsers = users;

		users = [];
		
		querySnapshot.forEach(function(doc) {
		    let uid = doc.id;
		    let {name, checkInTime, picks, zoomName} = doc.data();
		    if (uid) {
			users.push({uid: uid, name: name, checkInTime: checkInTime, picks: picks, zoomName: zoomName});
		    }
		});
		if (!deepEqual(users,oldUsers)) {
		    //		    sendNotify("Requests have changed");
		}
		//		mergePicks(users, true);  //hack to overcome background update failure in mavo
		signal();
		return 0;
	    };

	    firebaseReady.then(() => {
		watchUsers?.unsubscribe?.();

		if (!sid || !Number.isInteger(1*backTime)) return;
		
		let query = firebase.firestore().collection('ifdr-user')
		    .where('mysid','==',sid)
		    .where('checkInTime','>',Date.now()-1*backTime); //prune ancient checkins
 		watchUsers.unsubscribe = query.onSnapshot(parseQuery);
	    });
	    return [];
	})
    };

    getUsers = function() {
	return users;
    }

    let oldPlayMap = {};
    watchPlaylist = function(playlist) {
	let playMap = {};
	playlist.forEach(item => {playMap[item.label]=item});
	for (const label in playMap) {
	    if (playMap[label].note != oldPlayMap?.[label]?.note) {
		sendNotify("New note on " + label + ": " + playMap[label].note);
	    }
	    if (playMap[label]?.markid && (playMap[label]?.markid  != oldPlayMap?.[label]?.markid)) {
		sendNotify(label + " assigned to " + playMap[label].markid);
	    }
	}
	oldPlayMap = playMap;
    }
    
    let oldRequestMap = {};
    mergePicks = function(users, notify) {
	let requestMap = {}, newRequests=[];
	users?.forEach((u) => {
	    if (u) {
		let {name, uid, checkInTime, topPicks=[]}=u;
		topPicks.forEach(({label,timestamp=0}) => {
		    if (!requestMap[label]) {
			requestMap[label] = {label: label, count: 0, timestamp: 0, names: [], uids: {}};
		    }
		    let r=requestMap[label];
		    if (!r.uids[uid]) {
			r.count++;
			r.names.push(name);
			r.uids[uid]=true;
			if (r.timestamp < timestamp) {
			    r.timestamp = timestamp;
			}
			if (r.timestamp < checkInTime) {
			    r.timestamp = checkInTime;
			}
		    }
		});
	    }
	});
	for (const dance in requestMap) {
	    delete dance.uids;
	    if (!oldRequestMap[dance]) {
		newRequests.push(dance);
	    }
	}
	if (notify) {
	    if (newRequests.length == 1) {
		sendNotify("new request: " + newRequests[0]);
	    } else if (newRequests.length > 1) {
		sendNotify("new requests: " + newRequests.join(", "));
	    }
	}
	oldRequestMap = requestMap;
	return Object.values(requestMap);
    }
    
    let sessions=[];
    watchSessions = function() {
	watchSessions?.unsubscribe?.()
	firebaseReady.then(() => {
	    let count=0;
	    watchSessions.unsubscribe = firebase.firestore().collection('ifdr-session').onSnapshot(shot=>{
		sessions = [];
		shot.forEach(doc => {
		    let s=doc.data();
		    s.id = doc.id;
		    sessions.push(s);
		    sessions.sort((a,b) => a.name > b.name);
		});
		signal();
	    });
	});
    }

    getSessions = function() {
	return JSON.parse(JSON.stringify(sessions));
    }

    makeIndex = function(list,key) {
	let map={};
	if (key) { //indexing objects
	    list.forEach(o => {
		if (o[key]) {
		    map[o[key]] = o;
		}
	    });
	} else { //indexing strings
	    list.forEach(s=> {
		map[s]=true;
	    })
	}
	return map;
    }
    
    lookup = function(index, key, def) {
	if (!!index && index.hasOwnProperty(key)) {
	    return index[key]
	} else {
	    return undefined
	}
    }

    rest = function(n, arr=n) {
	return arr.slice(arguments.length > 1 ? n : 1);
    }
    
    window.addEventListener('load', ()=> {
	document.body.addEventListener('focusin', (e)=> {
	    if (e.target.matches('.pending-delete')) {
		e.target.select();
	    }
	});
    });
})();

