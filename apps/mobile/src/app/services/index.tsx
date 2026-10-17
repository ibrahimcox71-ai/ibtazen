import { View } from "react-native";
import { useRouter } from "expo-router";
import { ENGAGEMENT_PROCESS, SERVICES } from "@ibtatech/config";
import { Card, CardText, CardTitle, Screen, SectionTitle } from "@/ui";

export default function ServicesScreen() {
  const router = useRouter();

  return (
    <Screen eyebrow="Services" title="Four capabilities, one delivery team.">
      <View style={{ gap: 10 }}>
        {SERVICES.map((service) => (
          <Card
            key={service.slug}
            onPress={() =>
              router.push({ pathname: "/services/[slug]", params: { slug: service.slug } })
            }
          >
            <CardTitle>{service.name}</CardTitle>
            <CardText>{service.tagline}</CardText>
          </Card>
        ))}
      </View>

      <SectionTitle>Every engagement includes</SectionTitle>
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
    </Screen>
  );
}
