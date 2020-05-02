const { graphql } = require("graphql");
const { MusicBrainz } = require("graphbrainz/lib/api");
const { createContext } = require("graphbrainz/lib/context");
const schema = require("graphbrainz/lib/schema");
const client = new MusicBrainz();
const context = createContext({ client });
const { get, head } = require("lodash/fp");

const fetchReleaseInfo = async query => {
  console.log("searching for ", query);
  try {
    const res = await graphql(
      schema.default,
      `
        query SearchReleases {
          search {
            releaseGroups(query: "${query}", first: 1) {
              edges {
                node {
                  disambiguation
                  firstReleaseDate
                  releases(status: OFFICIAL, first: 1) {
                    edges {
                      node {
                        releaseEvents {
                          date
                        }
                        mbid

                      }
                    }
                  }

                  title
                  mbid
                }
              }
            }
          }
        }
      `,
      null,
      context
    );
    const {
      data: {
        search: { releaseGroups }
      }
    } = res;
    const release = get(
      "node",
      head(
        get(
          "releases.edges",
          get("node", head(get("edges", releaseGroups) || [{ node: {} }]))
        )
      )
    );
    return release
      ? {
          mbid: get("mbid", release),
          releaseDate: get("date", head(get("releaseEvents", release)))
        }
      : null;
  } catch (e) {
    console.error(e);
  } finally {
  }
};

module.exports = fetchReleaseInfo;
