import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/user.model.js';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Find if the user already exists in our DB
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // If user exists, just return them
            return done(null, user);
        } else {
            // If not, check if they exist by email
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                // If they exist by email, link their Google ID
                user.googleId = profile.id;
                user.avatar = profile.photos[0].value;
                await user.save();
                return done(null, user);
            }

            // If user doesn't exist at all, create a new one
            const newUser = await User.create({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos[0].value
                // No password needed for OAuth users
            });
            return done(null, newUser);
        }
    } catch (error) {
        return done(error, false);
    }
}
));