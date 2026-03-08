using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.CDK;
using Constructs;

namespace Infra
{
    public class CloudfrontStack : MallientStack
    {
        internal CloudfrontStack(Construct scope, string id, string envName, IStackProps props = null)
            : base(scope, id, envName, props)
        {

        }
    }
}
