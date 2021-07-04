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
	fb.auth().onAuthStateChanged(signal);
    });


    afterNap = function(f, nap = 10000) {
	let lastTime = Date.now();
	let inner = function() {
	    if (Date.now()-lastTime > nap) {
		f();
	    }
	    lastTime=Date.now();
	}
	setInterval(inner, 100);
    }

    depends = function(x) {
	return x; //to expose hidden dependencies, add arguments
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

