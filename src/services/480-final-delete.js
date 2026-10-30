/* Browser Storage is not the inventory of image references in D1.
   A partially loaded page cannot prove that an image is orphaned. Keep the
   existing caller contract without inventory requests or image deletion. */
(function () {
  KIVO.BassamPurge = {
    referencedImages: function () { return null; }, /* complete inventory unknown */
    seen: function () {},
    keep: function () {},
    unkeep: function () {},
    gcImages: function () { return Promise.resolve(0); }
  };
})();
