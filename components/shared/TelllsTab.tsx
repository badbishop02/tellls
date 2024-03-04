import { redirect } from "next/navigation";

import { fetchCommunityPosts } from "@/lib/actions/community.actions";
import { fetchUserPosts } from "@/lib/actions/user.actions";

import TelllCard from "../cards/TelllsCard";

interface Result {
  name: string;
  image: string;
  id: string;
  tellls: {
    _id: string;
    text: string;
    parentId: string | null;
    author: {
      name: string;
      image: string;
      id: string;
    };
    community: {
      id: string;
      name: string;
      image: string;
    } | null;
    createdAt: string;
    children: {
      author: {
        image: string;
      };
    }[];
  }[];
}

interface Props {
  currentUserId: string;
  accountId: string;
  accountType: string;
}

async function TelllsTab({ currentUserId, accountId, accountType }: Props) {
  let result: Result;

  if (accountType === "Community") {
    result = await fetchCommunityPosts(accountId);
  } else {
    result = await fetchUserPosts(accountId);
  }

  if (!result) {
    redirect("/");
  }

  return (
    <section className='mt-9 flex flex-col gap-10'>
      {result.tellls.map((telll) => (
        <TelllCard
          key={telll._id}
          id={telll._id}
          currentUserId={currentUserId}
          parentId={telll.parentId}
          content={telll.text}
          author={
            accountType === "User"
              ? { name: result.name, image: result.image, id: result.id }
              : {
                  name: telll.author.name,
                  image: telll.author.image,
                  id: telll.author.id,
                }
          }
          community={
            accountType === "Community"
              ? { name: result.name, id: result.id, image: result.image }
              : telll.community
          }
          createdAt={telll.createdAt}
          comments={telll.children}
        />
      ))}
    </section>
  );
}

export default TelllsTab;
