import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import PostTelll from "@/components/forms/PostTelll";
import { fetchUser } from "@/lib/actions/user.actions";

async function Page() {
  const user = await currentUser();
  if (!user) return null;

  // fetch organization list created by user
  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  return (
    <>
      <h1 className='head-text text-green-500'>Create a Telll</h1>

      <PostTelll userId={userInfo._id} />
    </>
  );
}

export default Page;
