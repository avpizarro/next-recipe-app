import { sanityClient } from "../../lib/sanity";

const writeClient = sanityClient.withConfig({
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
});

export default async function likeButtonHandler(req, res) {
    const { _id } = JSON.parse(req.body);
    await writeClient
        .patch(_id)
        .setIfMissing({ likes: 0 })
        .inc({ likes: 1 })
        .commit()
        .catch((error) => console.log(error));

    res.status(200).json();
}
