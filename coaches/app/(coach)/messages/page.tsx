import { MessagesInbox } from "@/components/MessagesInbox";

export default function MessagesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Messages</h1>
      <p className="text-zinc-400 text-sm mb-6">Threads sorted by last activity.</p>
      <MessagesInbox />
    </div>
  );
}
