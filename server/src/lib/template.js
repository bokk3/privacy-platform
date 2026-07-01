import Handlebars from "handlebars";

/**
 * Compile and render a Handlebars template with the given context.
 * Useful for rendering email bodies or custom API payloads for brokers.
 */
export function renderTemplate(templateString, context) {
    if (!templateString) return "";
    try {
        const template = Handlebars.compile(templateString, { strict: true });
        return template(context);
    } catch (err) {
        throw new Error(`Failed to render template: ${err.message}`);
    }
}

/**
 * Builds the template context using an identity and a user's details.
 * Addresses, emails, and aliases are joined into string lists for easier
 * inclusion in text-based email templates.
 */
export function buildRequestContext(user, identity, broker) {
    // Extract and format lists from identity
    const previousNames = identity.aliases?.map((a) => a.fullName).join(", ") || "";
    const emails = [user.email, ...(identity.emails?.map((e) => e.email) || [])].join(", ");

    const addresses = (identity.addresses || [])
        .map((a) => {
            const parts = [a.line1, a.line2, a.city, a.region, a.postalCode, a.country].filter(Boolean);
            return parts.join(", ");
        })
        .join(" | ");

    const phones = (identity.phones || []).map((p) => p.phone).join(", ");

    return {
        userEmail: user.email,
        fullName: `${identity.firstName} ${identity.lastName}`,
        firstName: identity.firstName,
        lastName: identity.lastName,
        birthYear: identity.birthYear,
        previousNames,
        emails,
        addresses,
        phones,
        brokerName: broker.name,
        replyToEmail: user.email, // Or a proxy email if implemented later
    };
}
