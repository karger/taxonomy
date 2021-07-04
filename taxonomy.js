(function () {
    let loaded={}
    , db
	, render = function(item) {
		let id=item.id
		, elt = document.querySelector("#item"+id)
		;
		if (elt && typeof(id) != "undefined" && id != null) {
			Mavo.Node.get(elt).render(item);
			loaded[id]=true;
		}
	}
	;
    
    generateId = function() {
		var node = Mavo.Node.get(document.querySelector("[property='idCounter']"))
		, ret=parseInt(node.getData());
		node.render(ret+1);
		return ret;
    }

    firebaseReady.then(() => {
		db = firebase.firestore().collection("mavo-apps").doc("taxonomy").collection("data");

		let makeWatcher = function() {		
			return db.onSnapshot((snapshot) => {
				snapshot.docChanges().forEach(change => {
					var doc = change.doc;
					if (!doc.metadata.hasPendingWrites) { //not a local edit being pushed
						render(doc.data());
					}
				});
			});
		};

		let unsubscribe = makeWatcher();
		afterNap(() => {
			unsubscribe();
			unsubscribe=makeWatcher();
		});
	});
	
    saveItem = function(data) {
		firebaseReady.then(() => {
			let id=data.id;
			if (loaded[id]) {
				data = JSON.parse(JSON.stringify(data))
				db.doc(""+id).set(data)
			} else {
				db.doc(""+id).get().then((doc) => {
					loaded[id]=true;
					if (doc.exists) {
						render(doc.data());
					}
				});
			}
		});
    }
})();
