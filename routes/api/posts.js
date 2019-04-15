const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

//load Post model
const Post = require("../../models/Post");
//load Profile model
const Profile = require("../../models/Profile");

//validation
const VaidatePostInput = require("../../validation/post");

/**
 * @route   GET api/posts
 * @desc    get post
 * @access  public
 */
router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err =>
      res.status(404).json({ noPostFound: "No post found with that id." })
    );
});

/**
 * @route   GET api/posts/:id
 * @desc    get post by id
 * @access  public
 */
router.get("/:id", (req, res) => {
  Post.findById(req.params.id)
    .then(post => res.json(post))
    .catch(err =>
      res.status(404).json({ noPostFound: "No post found with that id." })
    );
});

/**
 * @route   POST api/posts
 * @desc    create post
 * @access  private
 */
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = VaidatePostInput(req.body);

    //check out validation
    if (!isValid) {
      //if any errors, send 400 with errors object
      return res.status(400).json(errors);
    }
    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });

    //save
    newPost.save().then(post => res.json(post));
  }
);

/**
 * @route   DELETE api/posts/:id
 * @desc    delete post by id
 * @access  private
 */
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          //check for post owner
          if (post.user.toString() !== req.user.id) {
            return res
              .status(401)
              .json({ notAuthorized: "User is not authorized" });
          }

          //delete
          post.remove().then(() => res.json({ success: true }));
        })
        .catch(err =>
          res.status(404).json({ postNotFound: "Post not found." })
        );
    });
  }
);

/**
 * @route   POST api/posts/like/:id
 * @desc    Like post
 * @access  private
 */
router.post(
  "/like/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          if (
            post.likes.filter(
              like => like.user.toString() === req.user.id.length > 0
            )
          ) {
            return res
              .status(404)
              .json({ alreadyLiked: "User already like this post." });
          }
          //add user id to likes array
          post.likes.unshift({ user: req.user.id });
          post.save().then(post => res.json(post));
        })
        .catch(err =>
          res.status(404).json({ postNotFound: "Post not found." })
        );
    });
  }
);

/**
 * @route   POST api/posts/unlike/:id
 * @desc    unlike post
 * @access  private
 */
router.post(
  "/unlike/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          if (
            post.likes.filter(like => like.user.toString() === req.user.id)
              .length === 0
          ) {
            return res
              .status(400)
              .json({ notliked: "You have not yet liked this post." });
          }

          //get remove index
          const removeIndex = post.likes
            .map(item => item.user.toString())
            .indexOf(req.user.id);

          //splice out of array
          post.likes.splice(removeIndex, 1);

          //save
          post.save().then(post => res.json(post));
        })
        .catch(err =>
          res.status(404).json({ postNotFound: "Post not found." })
        );
    });
  }
);

/**
 * @route   POST api/posts/comment/:id
 * @desc    add comment to post
 * @access  private
 */
router.post(
  "/comment/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = VaidatePostInput(req.body);

    //check out validation
    if (!isValid) {
      //if any errors, send 400 with errors object
      return res.status(400).json(errors);
    }
    Post.findById(req.params.id)
      .then(post => {
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        };

        //add to comments array
        post.comments.unshift(newComment);

        //save
        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(404).json({ postNotFound: "Post not found." }));
  }
);

/**
 * @route   DELETE api/posts/comment/:id/:comment_id
 * @desc    remove comment from post
 * @access  private
 */
router.delete(
  "/comment/:id/:comment_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        //check to see if comment exists
        if (
          post.comments.filter(
            comment => comment._id.toString() === req.params.comment_id
          ).length === 0
        ) {
          return res
            .status(404)
            .json({ commentNotExists: "Comment does not exist." });
        }
        // get remove index
        const removeIndex = post.comments
          .map(item => item._id.toString())
          .indexOf(req.params.comment_id);

        //splice comment out of array
        post.comments.splice(removeIndex, 1);

        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(404).json({ postNotFound: "Post not found." }));
  }
);
module.exports = router;
