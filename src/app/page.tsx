import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import sleepyAvatar from "@/assets/brand/sleepy-avatar.png";

export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-4">
        <Image
          src={sleepyAvatar}
          alt="Sleepy"
          width={112}
          height={112}
          priority
          placeholder="blur"
          className="size-24 rounded-full border border-border object-cover shadow-sm sm:size-28"
        />
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Sleepy
        </h1>
      </div>
      <ThemeToggle />
    </main>
  );
}
