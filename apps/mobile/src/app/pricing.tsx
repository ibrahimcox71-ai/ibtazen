import { View } from "react-native";
import { useRouter } from "expo-router";
import { BUDGET_BANDS, ENGAGEMENT_PROCESS, GLOBAL_FAQS } from "@ibtatech/config";
import { Body, Button, Card, CardText, CardTitle, Screen, SectionTitle } from "@/ui";

const costQuestion = GLOBAL_FAQS.find((faq) => faq.question.includes("cost"));

export default function PricingScreen() {
  const router = useRouter();

  return (
    <Screen eyebrow="Pricing" title="Transparent pricing, scoped honestly.">
      <Body>
        Indicative budget bands only — every system differs, so the real number comes after scoping
        and you approve it before work begins.
      </Body>

      <SectionTitle>Typical budget bands</SectionTitle>
      <View style={{ gap: 10 }}>
        {BUDGET_BANDS.map((band) => (
          <Card key={band.value}>
            <CardTitle>{band.label}</CardTitle>
          </Card>
        ))}
      </View>

      <SectionTitle>What shapes the number</SectionTitle>
      <View style={{ gap: 10 }}>
        {ENGAGEMENT_PROCESS.map((step, index) => (
          <Card key={step.name}>
            <CardTitle>
              {index + 1}. {step.name}
            </CardTitle>
            <CardText>{step.description}</CardText>
          </Card>
        ))}
      </View>

      {costQuestion ? (
        <>
          <SectionTitle>Pricing question</SectionTitle>
          <Card>
            <CardTitle>{costQuestion.question}</CardTitle>
            <CardText>{costQuestion.answer}</CardText>
          </Card>
        </>
      ) : null}

      <View style={{ gap: 10, marginTop: 8 }}>
        <Button label="Get a real number" onPress={() => router.push("/contact")} />
        <Button
          label="Read every pricing answer in the FAQ"
          variant="secondary"
          onPress={() => router.push("/faq")}
        />
      </View>
    </Screen>
  );
}
