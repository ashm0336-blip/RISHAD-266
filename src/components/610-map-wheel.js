
(function(){
  document.addEventListener('wheel', function(e){
    var t = e.target;
    if (t && t.closest && t.closest('svg[data-map-zoom],svg[data-ds-zoom]')) e.preventDefault();
  }, {passive:false});
})();
