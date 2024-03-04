"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Telll from "../models/telll.model";
import Community from "../models/community.model";

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level Tellls) (a Telll that is not a comment/reply).
  const postsQuery = Telll.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "community",
      model: Community,
    })
    .populate({
      path: "children", // Populate the children field
      populate: {
        path: "author", // Populate the author field within children
        model: User,
        select: "_id name parentId image", // Select only _id and username fields of the author
      },
    });

  // Count the total number of top-level posts (Tellls) i.e., Tellls that are not comments.
  const totalPostsCount = await Telll.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

interface Params {
  text: string,
  author: string,
  communityId: string | null,
  path: string,
}

export async function createTelll({ text, author, communityId, path }: Params
) {
  try {
    connectToDB();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdTelll = await Telll.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    });

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { tellls: createdTelll._id },
    });

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { tellls: createdTelll._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create the Telll: ${error.message}`);
  }
}

async function fetchAllChildTellls(telllId: string): Promise<any[]> {
  const childTellls = await Telll.find({ parentId: telllId });

  const descendantTellls = [];
  for (const childTelll of childTellls) {
    const descendants = await fetchAllChildTellls(childTelll._id);
    descendantTellls.push(childTelll, ...descendants);
  }

  return descendantTellls;
}

export async function deleteTelll(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    // Find the Telll to be deleted (the main Telll)
    const mainTelll = await Telll.findById(id).populate("author community");

    if (!mainTelll) {
      throw new Error("Telll not found");
    }

    // Fetch all child Tellls and their descendants recursively
    const descendantTellls = await fetchAllChildTellls(id);

    // Get all descendant Telll IDs including the main Telll ID and child Telll IDs
    const descendantTelllIds = [
      id,
      ...descendantTellls.map((telll) => telll._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantTellls.map((telll) => telll.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainTelll.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantTellls.map((telll) => telll.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainTelll.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child Tellls and their descendants
    await Telll.deleteMany({ _id: { $in: descendantTelllIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { Tellls: { $in: descendantTelllIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { Tellls: { $in: descendantTelllIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete Telll: ${error.message}`);
  }
}

export async function fetchTelllById(telllId: string) {
  connectToDB();

  try {
    const telll = await Telll.findById(telllId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      }) // Populate the community field with _id and name
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: Telll, // The model of the nested children (assuming it's the same "Telll" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();

    return telll;
  } catch (err) {
    console.error("Error while fetching Tellls:", err);
    throw new Error("Unable to fetch Telll");
  }
}

export async function addCommentToTelll(
  telllId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    // Find the original Telll by its ID
    const originalTelll = await Telll.findById(telllId);

    if (!originalTelll) {
      throw new Error("Telll not found");
    }

    // Create the new comment Telll
    const commentTelll = new Telll({
      text: commentText,
      author: userId,
      parentId: telllId, // Set the parentId to the original Telll's ID
    });

    // Save the comment Telll to the database
    const savedCommentTelll = await commentTelll.save();

    // Add the comment Telll's ID to the original Telll's children array
    originalTelll.children.push(savedCommentTelll._id);

    // Save the updated original Telll to the database
    await originalTelll.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}
