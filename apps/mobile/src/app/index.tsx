import { Linking, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ENGAGEMENT_PROCESS,
  NAV_LINKS,
  POSITIONING_FACTS,
  PRIMARY_CTA,
  SERVICES,
  SITE,
} from "@ibtatech/config";
import { Body, Button, Card, CardText, CardTitle, Chip, Screen, SectionTitle } from "@/ui";

/**
 * The blog is published on the marketing site only — there is no in-app
 * screen yet, so that chip opens the website instead of an Expo route.
 */
const isWebOnlyRoute = (href: string): href is "/blog" => href === "/blog";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen
      eyebrow="UK · Europe · Worldwide"
      title="Digital technology and growth, engineered together."
    >
      <Body>{SITE.description}</Body>

      <View style={{ gap: 10 }}>
        <Button label={PRIMARY_CTA.label} onPress={() => router.push("/contact")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {NAV_LINKS.map((link) => (
            <Chip
              key={link.href}
              label={link.label}
              onPress={() => {
                if (isWebOnlyRoute(link.href)) {
                  void Linking.openURL(`${SITE.url}${link.href}`);
                  return;
                }
                router.push(link.href);
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {POSITIONING_FACTS.map((fact) => (
          <Card key={fact.title}>
            <CardTitle>{fact.title}</CardTitle>
            <CardText>{fact.description}</CardText>
          </Card>
        ))}
      </View>

      <SectionTitle>What we build</SectionTitle>
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

      <SectionTitle>How engagements run</SectionTitle>
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
