function debounce(e, t, n) {
    var i;
    return function() {
        var a = this,
            o = arguments,
            r = function() {
                i = null, n || e.apply(a, o)
            },
            c = n && !i;
        clearTimeout(i), i = setTimeout(r, t), c && e.apply(a, o)
    }
}
function createBase64Image(e, t) {
    function n(n) {
        var i = document.createElement("canvas");
        e.imageWidth && (n.width = e.imageWidth), e.imageHeight && (n.height = e.imageHeight), i.width = e.canvasWidth || n.width, i.height = e.canvasHeight || n.height;
        var a = i.getContext("2d");
        a.drawImage(n, i.width / 2 - n.width / 2, i.height / 2 - n.height / 2, n.width, n.height);
        var o = i.toDataURL("image/png"),
            r = new Image;
        r.onload = function() {
            t && t(r)
        }, r.src = o
    }
    if (e || (e = {
        image: domReference,
        imageWidth: 500,
        imageHeight: 500,
        canvasWidth: window.innerWidth,
        canvasHeight: window.innerHeight
    }), "string" == typeof e.image) {
        var i = new Image;
        i.onload = function() {
            n(i)
        }, i.src = e.image
    } else
        n(e.image)
}
function shuffleArray(e) {
    for (var t = e.slice(), n = t.length - 1; n > 0; n--) {
        var i = Math.floor(Math.random() * (n + 1)),
            a = t[n];
        t[n] = t[i], t[i] = a
    }
    return t
}
function vmin(e) {
    e || (e = 1);
    var t = Math.min(window.innerWidth, window.innerHeight);
    return t * e
}
document.addEventListener("touchmove", function(e) {
    e.preventDefault()
}), window.addEventListener("load", function() {
    function e() {
        var e = a.getBoundingClientRect(),
            t = c.getBoundingClientRect(),
            n = {
                x: e.width / t.width,
                y: e.height / t.height
            },
            i = t.height + t.y,
            o = e.y - i + e.height;
        c.style.transform = "translate(0," + o + "px) scale(" + n.x + ", " + n.y + ")"
    }
    function t() {
        e(), r.innerText = "What is this?", a.classList.toggle("active"), i.classList.toggle("open"), h = !1
    }
    function n() {
        e(), r.innerText = "Close", a.classList.toggle("active"), i.classList.toggle("open"), h = !0
    }
    var i = document.querySelector(".why");
    if (i) {
        var a = document.querySelector("#whyButton"),
            o = document.querySelector(".why__overlay"),
            r = a.querySelector(".why__button__text"),
            c = document.querySelector(".why__bg"),
            h = !1;
        a.addEventListener("click", function(e) {
            e.stopPropagation(), h ? (r.innerText = "What is this?", t()) : (r.innerText = "Close", n())
        }), i.addEventListener("click", function() {
            t()
        }), o.addEventListener("click", function(e) {
            e.stopPropagation()
        }), e(), document.body.addEventListener("keydown", function(e) {
            27 == e.which && t()
        })
    }
});