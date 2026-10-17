import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  CLIENT_TYPES,
  ENGAGEMENT_PROCESS,
  POSITIONING_FACTS,
  SERVICES,
  TECH_STACK_GROUPS,
} from "@ibtatech/config";
import { Card, CardText, CardTitle, Screen, SectionTitle } from "@/ui";

export default function AboutScreen() {
  const router = useRouter();

  return (
    <Screen eyebrow="About" title="Senior people, honest scope, work you own.">
      <Card>
        <CardText>
          Ibtatech is a digital technology and growth agency: engineers and strategists building
          websites, web applications and mobile apps alongside email automation and paid advertising
          programmes.
        </CardText>
      </Card>

      <SectionTitle>How we work</SectionTitle>
      <View style={{ gap: 10 }}>
        {POSITIONING_FACTS.map((fact) => (
          <Card key={fact.title}>
            <CardTitle>{fact.title}</CardTitle>
            <CardText>{fact.description}</CardText>
          </Card>
        ))}
      </View>

      <SectionTitle>Who we build for</SectionTitle>
      <View style={{ gap: 10 }}>
        {CLIENT_TYPES.map((client) => (
          <Card key={client.title}>
            <CardTitle>{client.title}</CardTitle>
            <CardText>{client.description}</CardText>
          </Card>
        ))}
      </View>

      <SectionTitle>Engagement process</SectionTitle>
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

      <SectionTitle>Technology</SectionTitle>
      <View style={{ gap: 10 }}>
        {TECH_STACK_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardTitle>{group.title}</CardTitle>
            <CardText>{group.items.join(" · ")}</CardText>
          </Card>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Card onPress={() => router.push("/services")}>
          <CardTitle>Services</CardTitle>
          <CardText>{SERVICES.length} capability areas, from scoping to launch.</CardText>
        </Card>
      </View>
    </Screen>
  );
}
