import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    /* for (const post of ops.posts.creates) {
      console.log(post.record.text)
    } */

    var filterStrings = ['lalafell', 'ララフェル', 'おはララ', 'おやララ', 'おつララ'],
        regexFilter = new RegExp(filterStrings.join('|'), 'iv')

    // console.log(regexFilter)

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // only lalafell-related posts
        // return create.record.text.toLowerCase().includes('alf')

        // var result = create.record.text.toLowerCase().search(regexFilter)
        var result = regexFilter.test(create.record.text.toLowerCase())

        if (result === true) {
          /* if (create.record.facets) {
            console.log(create.record.facets)
          } */

          return create
        }

        // console.log(create.record.text.toLowerCase().search(regexFilter))
        // return create.record.text.toLowerCase().search(regexFilter)
      })
      .map((create) => {
        // map lala-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
