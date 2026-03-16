import { useState } from "react";
import { useConfirmRedirect } from "./hooks/useConfirmRedirect";
import { useUnsubscribeRedirect } from "./hooks/useUnsubscribeRedirect";
import { PageLayout } from "./components/PageLayout";
import { HeroSection } from "./components/HeroSection";
import { ConfirmPage } from "./components/ConfirmPage";
import { UnsubscribePage } from "./components/UnsubscribePage";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { NewsletterPreview } from "./components/NewsletterPreview";

function App() {
  const initialPendingToken = useConfirmRedirect();
  const initialUnsubscribeToken = useUnsubscribeRedirect();

  const [pendingToken, setPendingToken] = useState<string | null>(
    initialPendingToken,
  );
  const [unsubscribeToken, setUnsubscribeToken] = useState<string | null>(
    initialUnsubscribeToken,
  );

  if (unsubscribeToken !== null) {
    return (
      <UnsubscribePage
        token={unsubscribeToken}
        onBack={() => setUnsubscribeToken(null)}
      />
    );
  }

  if (pendingToken !== null) {
    return (
      <ConfirmPage token={pendingToken} onBack={() => setPendingToken(null)} />
    );
  }

  return (
    <PageLayout>
      <HeroSection
        heading="STAY AHEAD OF THE MARKET."
        description="Chart snapshots delivered to your inbox every session."
      />
      <SubscriptionForm />
      <NewsletterPreview />
    </PageLayout>
  );
}

export default App;
