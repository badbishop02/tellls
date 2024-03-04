import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs";

import Comment from "@/components/forms/Comment";
import TelllCard from "@/components/cards/TelllsCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchTelllById } from "@/lib/actions/telll.actions";

export const revalidate = 0;

async function page({ params }: { params: { id: string } }) {
  if (!params.id) return null;

  const user = await currentUser();
  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const telll = await fetchTelllById(params.id);

  return (
    <section className='relative'>
      <div>
        <TelllCard
          id={telll._id}
          currentUserId={user.id}
          parentId={telll.parentId}
          content={telll.text}
          author={telll.author}
          community={telll.community}
          createdAt={telll.createdAt}
          comments={telll.children}
        />
      </div>

      <div className='mt-7'>
        <Comment
          telllId={params.id}
          currentUserImg={user.imageUrl}
          currentUserId={JSON.stringify(userInfo._id)}
        />
      </div>

      <div className='mt-10'>
        {telll.children.map((childItem: any) => (
          <TelllCard
            key={childItem._id}
            id={childItem._id}
            currentUserId={user.id}
            parentId={childItem.parentId}
            content={childItem.text}
            author={childItem.author}
            community={childItem.community}
            createdAt={childItem.createdAt}
            comments={childItem.children}
            isComment
          />
        ))}
      </div>
    </section>
  );
}

export default page;
