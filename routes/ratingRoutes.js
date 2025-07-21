const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/ratingController");
const auth = require("../middleware/auth");

router.post("/create", auth, ratingController.createRating);
router.post("/websubcat", auth, ratingController.websubcreateRating);
router.get("/websubcat/:subcat/:id?", ratingController.getSubCatRatings);
router.post("/servicesubcat", auth, ratingController.servicesubcreateRating);
router.get(
  "/servicesubcat/:subcat/:id?",
  ratingController.getserviceSubCatRatings
);
router.get("/all/:userId/:id?", ratingController.getUserRatings);
router.delete("websubcat/:id", auth, ratingController.deleteSubCatRating);
module.exports = router;
