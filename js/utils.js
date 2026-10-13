/*

Util functions
------------------------	
	
*/

// Object to array
var toArray = function(obj){

	var arr = Object.keys(obj).map(function (key) { return obj[key]; });
	
	return arr;
	
}

// Is empty object

var isEmptyObject = function(obj) {
  for(var prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      return false;
    }
  }
  return true;
}

// Array.contains(value)

Array.prototype.contains = function(val) {
	var tot = this.length;
    for (var i = 0; i < tot; i++) {
        if (this[i] === val) {
            return true;
        }
    }
    return false;
}

// Array chunker
Array.prototype.chunkify  = function(n,balanced){
	
	var a = this;
	
	if (n < 2)
        return [a];

    var len = a.length,
            out = [],
            i = 0,
            size;

    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(a.slice(i, i += size));
        }
    }

    else if (balanced) {
        while (i < len) {
            size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
    }

    else {

        n--;
        size = Math.floor(len / n);
        if (len % size === 0)
            size--;
        while (i < size * n) {
            out.push(a.slice(i, i += size));
        }
        out.push(a.slice(size * n));

    }

    return out;
	
}

// Array shuffler
Array.prototype.shuffle = function() {
  var i = this.length, j, temp;
  if ( i == 0 ) return this;
  while ( --i ) {
     j = Math.floor( Math.random() * ( i + 1 ) );
     temp = this[i];
     this[i] = this[j];
     this[j] = temp;
  }
  return this;
}

// Array sort by object property
Array.prototype.propSort = function(prop, direction){
   
    var direct = (typeof direction != 'undefined') ? direction : 1; //Default to ascending
	

	if(typeof prop != 'string') return;
	
    var propPath = (prop.constructor===Array) ? prop : prop.split(".");
    this.sort(function(a,b){
	    
	   
	    
        for (var p in propPath){
            if (a[propPath[p]] && b[propPath[p]]){
                a = a[propPath[p]];
                b = b[propPath[p]];
            }
        }
        
         // Convert to string
	    a = (a+'').toLowerCase();
	    b = (b+'').toLowerCase();
	    
        // convert numeric strings to integers
        a = a.match(/^\d+$/) ? +a : a;
        b = b.match(/^\d+$/) ? +b : b;
        return ( (a < b) ? -1*direct : ((a > b) ? 1*direct : 0) );
    });
    
    return this;
}