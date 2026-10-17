import { View } from "react-native";
import * as Linking from "expo-linking";
import { PRIMARY_CTA, SITE } from "@ibtatech/config";
import { Body, Button, Card, CardText, CardTitle, Screen, SectionTitle } from "@/ui";

const bookingUrl = `${SITE.url}/book`;

export default function ContactScreen() {
  return (
    <Screen eyebrow="Contact" title="Start with a free discovery call.">
      <Body>
        Tell us what you are building and what is in the way. We reply with a written scope and a
        preliminary estimate before any commitment.
      </Body>

      <SectionTitle>Reach us directly</SectionTitle>
      <View style={{ gap: 10 }}>
        <Card onPress={() => Linking.openURL(`mailto:${SITE.email}`)}>
          <CardTitle>Email</CardTitle>
          <CardText>{SITE.email}</CardText>
        </Card>
        <Card onPress={() => Linking.openURL(SITE.url)}>
          <CardTitle>Website</CardTitle>
          <CardText>{SITE.domain}</CardText>
        </Card>
        <Card onPress={() => Linking.openURL(bookingUrl)}>
          <CardTitle>{PRIMARY_CTA.label}</CardTitle>
          <CardText>Opens the booking form on {SITE.domain}.</CardText>
        </Card>
      </View>

      <SectionTitle>What happens next</SectionTitle>
      <Card>
        <CardText>
          A free 30-minute call to map goals and constraints, then a written plan with timeline and
          preliminary estimate — approved before any work starts.
        </CardText>
      </Card>

      <Button
        label={`Email ${SITE.email}`}
        onPress={() => Linking.openURL(`mailto:${SITE.email}`)}
      />

      <Body>
        Project briefs submitted through the website form reach the same inbox — the in-app form
        arrives with the public API phase.
      </Body>
    </Screen>
  );
}
