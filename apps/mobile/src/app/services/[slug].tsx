import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SERVICES } from "@ibtatech/config";
import { isServiceSlug } from "@ibtatech/types";
import { Bullet, Body, Button, Card, CardText, CardTitle, Screen, SectionTitle } from "@/ui";

export default function ServiceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const service = isServiceSlug(slug) ? SERVICES.find((s) => s.slug === slug) : undefined;

  if (!service) {
    return (
      <Screen eyebrow="Services" title="Service not found">
        <Body>
          That service does not exist. Pick one of the four capabilities from the services list.
        </Body>
        <Button label="Back to services" onPress={() => router.replace("/services")} />
      </Screen>
    );
  }

  return (
    <Screen eyebrow={service.name} title={service.headline}>
      <Body>{service.subheadline}</Body>

      <SectionTitle>Problems this removes</SectionTitle>
      <View style={{ gap: 8 }}>
        {service.problems.map((problem) => (
          <Bullet key={problem}>{problem}</Bullet>
        ))}
      </View>

      <SectionTitle>What you get</SectionTitle>
      <View style={{ gap: 10 }}>
        {service.capabilities.map((group) => (
          <Card key={group.title}>
            <CardTitle>{group.title}</CardTitle>
            <View style={{ gap: 6, marginTop: 4 }}>
              {group.items.map((item) => (
                <Bullet key={item}>{item}</Bullet>
              ))}
            </View>
          </Card>
        ))}
      </View>

      <SectionTitle>How it runs</SectionTitle>
      <View style={{ gap: 10 }}>
        {service.process.map((step, index) => (
          <Card key={step.name}>
            <CardTitle>
              {index + 1}. {step.name}
            </CardTitle>
            <CardText>{step.description}</CardText>
          </Card>
        ))}
      </View>

      {service.faqs.length > 0 && (
        <>
          <SectionTitle>Questions</SectionTitle>
          <View style={{ gap: 10 }}>
            {service.faqs.map((faq) => (
              <Card key={faq.question}>
                <CardTitle>{faq.question}</CardTitle>
                <CardText>{faq.answer}</CardText>
              </Card>
            ))}
          </View>
        </>
      )}

      <View style={{ gap: 10, marginTop: 8 }}>
        <Button label={service.ctaLabel} onPress={() => router.push("/contact")} />
        <Button
          label={service.secondaryCtaLabel}
          variant="secondary"
          onPress={() => router.push("/services")}
        />
      </View>
    </Screen>
  );
}
