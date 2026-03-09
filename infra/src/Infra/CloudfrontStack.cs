using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.S3;
using Constructs;

namespace Infra
{
    public class CloudfrontStack : MallientStack
    {
        internal CloudfrontStack(Construct scope, string id, string envName, IStackProps props = null)
            : base(scope, id, envName, props)
        {
            var siteBucket = new Bucket(this, $"MVSiteBucket-{envName}", new BucketProps
            {
                BucketName = $"mallient-verify-ui-bucket-{envName}",
                PublicReadAccess = false,
                RemovalPolicy = RemovalPolicy.DESTROY,
                AutoDeleteObjects = true,
                BlockPublicAccess = BlockPublicAccess.BLOCK_ALL
            });

            var oai = new OriginAccessIdentity(this, $"OAI-{envName}", new OriginAccessIdentityProps
            {
                Comment = $"OAI for {envName}"
            });
        }
    }
}
