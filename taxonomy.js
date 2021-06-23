(function () {
    var loaded={}
    , db;
    
    generateId = function() {
		var node = Mavo.Node.get(document.querySelector("[property='idCounter']"))
		, ret=parseInt(node.getData());
		node.render(ret+1);
		return ret;
    }

    firebaseReady.then(() => {
		db = firebase.firestore().collection("mavo-apps").doc("taxonomy").collection("data");

		db.onSnapshot((snapshot) => {
			snapshot.docChanges().forEach(change => {
				var doc = change.doc
				, data = doc.data()
				, id=data.id
				, elt = document.querySelector("#"+id);
				if (elt & !doc.metadata.hasPendingWrites) {
					Mavo.Node.get(elt).render(data);
					loaded[id]=true;
				}
			});
	    });
    });
    
    saveDimension = function(data) {
		firebaseReady.then(() => {
			var id = data.id;
			if (loaded[id] || !!data.new) {
				var elt = document.querySelector("#dim"+id);
				if (elt) {
					data = Mavo.Node.get(elt)?.getData(false);
					data.new=false;
					db.doc(""+id).set(data);
				}
			}
		});
    }
})();
