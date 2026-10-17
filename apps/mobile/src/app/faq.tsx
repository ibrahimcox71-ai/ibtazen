import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { GLOBAL_FAQS } from "@ibtatech/config";
import { Body, Button, Card, CardText, CardTitle, Screen } from "@/ui";

export default function FaqScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(GLOBAL_FAQS[0]?.question ?? null);

  return (
    <Screen eyebrow="FAQ" title="Answers before the first call.">
      <View style={{ gap: 10 }}>
        {GLOBAL_FAQS.map((faq) => {
          const expanded = open === faq.question;
          return (
            <Card key={faq.question} onPress={() => setOpen(expanded ? null : faq.question)}>
              <CardTitle>{faq.question}</CardTitle>
              {expanded ? <CardText>{faq.answer}</CardText> : null}
            </Card>
          );
        })}
      </View>

      <Body>Still unsure? A free discovery call is the fastest way to get a straight answer.</Body>
      <Button label="Book a Free Discovery Call" onPress={() => router.push("/contact")} />
    </Screen>
  );
}
