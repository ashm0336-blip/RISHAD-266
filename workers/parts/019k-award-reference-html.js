/* Generated from Award awEsc/awSecToHtml, one presentation source. */
var AW_REFERENCE_HTML=(function(){var formatter=new(class{awEsc(t) {
    return String(null == t ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
awSecToHtml(t) {
    const e = (t && t.items) || [];
    let a = "",
      r = [];
    const i = () => {
      r.length && ((a += "<ul>" + r.join("") + "</ul>"), (r = []));
    };
    return (
      e.forEach((t) => {
        const e = "t" === t.k ? "p" : t.k || "p",
          s = this.awEsc(t.t);
        "l" !== e
          ? (i(),
            (a +=
              "h" === e
                ? "<h4>" + s + "</h4>"
                : "s" === e
                  ? "<h5>" + s + "</h5>"
                  : "c" === e
                    ? '<p><span class="chip">' + s + "</span></p>"
                    : "<p>" + s + "</p>"))
          : r.push("<li>" + s + "</li>");
      }),
      i(),
      a
    );
  }})();return function(section){return formatter.awSecToHtml(section);};})();
